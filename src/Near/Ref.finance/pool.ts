import { connect, ConnectConfig, Near, Account } from "near-api-js";
import { LoggerFactory } from '../../library/LoggerFactory';
import { TokenDB } from '../db.token';
import { ProjectConfig as Config } from './config';
import { ChainConfig } from '../config';
import BigNumber from "bignumber.js";
import { ERC20Token } from "src/library/erc20.token";

const logger = LoggerFactory.getInstance().getLogger('Pool');

export type PoolRawInfo = {
    pool_kind: string,
    /// List of tokens in the pool.
    token_account_ids: string[]
    /// How much NEAR this contract has.
    amounts: [],
    /// Fee charged for swap.
    total_fee: number,
    /// Total number of shares.
    shares_total_supply: string,
    amp: number,
}

export type PoolInfo = {
    id: number,
    name: string,
    poolType: string,
    /// List of tokens in the pool.
    tokens: TokenBalance[]
    totalSupply: string,
    sharePrice: number,
    shareDecimals: number
}

export type TokenBalance = {
    token: ERC20Token,
    amount: string
}

const gTokenDB = TokenDB.getInstance(ChainConfig.mainnet);

export class PoolHelper {
    private config: ConnectConfig
    private connected: boolean
    private near: Near;
    private defaultAccount: Account;
    private static instance: PoolHelper;

    constructor(config: ConnectConfig) {
        this.config = config;
        this.connected = false;
    }


    static getInstance(config: ConnectConfig) {
        if (!PoolHelper.instance) {
            PoolHelper.instance = new PoolHelper(config);
        }
        return PoolHelper.instance;
    }

    private async checkConnection() {
        if (!this.connected) {
            logger.warn(`checkConnecttion > no connection to Near network.`);
            await this.connectToNetwork()
        }
    }

    public async connectToNetwork() {
        this.near = await connect(this.config);
        this.connected = true;
        logger.info(`connectToNetwork > connected to Near network - ${this.config.networkId}`);
        this.defaultAccount = await this.near.account(Config.account.default);
    }

    /**
     * 获取LP的信息
     * @param poolId - LP Id
     * @returns PoolInfo
     * for more interface, check https://github.com/ref-finance/ref-contracts/blob/main/ref-exchange/src/views.rs
     */
    public async getPoolRawInfo(poolId: number): Promise<PoolRawInfo> {
        await this.checkConnection();
        const poolInfoData = await this.defaultAccount.viewFunction(Config.contract.exchange, 'get_pool', { pool_id: poolId });
        const poolInfo: PoolRawInfo = {
            pool_kind: poolInfoData['pool_kind'],
            token_account_ids: poolInfoData['token_account_ids'],
            amounts: poolInfoData['amounts'],
            total_fee: poolInfoData['total_fee'],
            shares_total_supply: poolInfoData['shares_total_supply'],
            amp: poolInfoData['amp']
        }
        return poolInfo;
    }

    public async getPoolInfo(poolId: number, decimals = 8): Promise<PoolInfo> {
        const poolRawInfo = await this.getPoolRawInfo(poolId)
        const sharePrice = await this.getSharePrice(poolId)
        const poolInfo: PoolInfo = {
            id: poolId,
            name: "",
            poolType: "",
            tokens: [],
            totalSupply: "",
            sharePrice: Number.parseFloat(sharePrice.toNumber().toFixed(decimals)),
            shareDecimals: 18
        }
        poolInfo.poolType = poolRawInfo.pool_kind
        const tokenSymbols = [];
        let i = 0
        for (const tokenId of poolRawInfo.token_account_ids) {
            const token = await gTokenDB.syncUp(tokenId);
            tokenSymbols.push(token.symbol);
            poolInfo.tokens.push({
                token,
                amount: token.readableAmount(poolRawInfo.amounts[i]).toFixed(decimals)
            })
            i = i + 1
        }
        poolInfo.name = tokenSymbols.join('-')
        poolInfo.shareDecimals = poolInfo.poolType === 'STABLE_SWAP' ? 18 : 24
        poolInfo.totalSupply = new BigNumber(poolRawInfo.shares_total_supply).dividedBy(Math.pow(10, poolInfo.shareDecimals)).toNumber().toFixed(6)
        return poolInfo;
    }

    public async getPoolShareBalance(poolId: number, accountId: string): Promise<BigNumber> {
        await this.checkConnection();
        const shares = await this.defaultAccount.viewFunction(Config.contract.exchange, 'get_pool_shares', { pool_id: poolId, account_id: accountId });
        return new BigNumber(shares);
    }

    public async getSharePrice(poolId: number): Promise<BigNumber> {
        await this.checkConnection();
        // decimals = 1e8
        const price = await this.defaultAccount.viewFunction(Config.contract.exchange, 'get_pool_share_price', { pool_id: poolId });
        return new BigNumber(price).dividedBy(1e8);
    }

    public async getPoolBalanceDetails(poolInfo: PoolInfo, shareBalance: BigNumber): Promise<TokenBalance[]> {
        const balances: TokenBalance[] = [];
        const ratio = shareBalance.dividedBy(Math.pow(10, poolInfo.shareDecimals)).dividedBy(poolInfo.totalSupply);
        for (const tokenBalance of poolInfo.tokens) {
            const token = tokenBalance.token;
            const tokenAmount = ratio.multipliedBy(tokenBalance.amount);
            logger.info(`getPoolBalanceDetails > token - ${token.symbol}: ${tokenAmount}`)
            balances.push({
                token,
                amount: tokenAmount.toNumber().toString()
            })
        }
        return balances;
    }
}
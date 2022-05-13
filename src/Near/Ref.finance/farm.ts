import { connect, ConnectConfig, Near, Account } from "near-api-js";
import { LoggerFactory } from '../../library/LoggerFactory';
import { TokenDB } from '../db.token';
import { ProjectConfig as Config } from './config';
import { ChainConfig } from '../config';
import BigNumber from "bignumber.js";
import { ERC20Token } from "src/library/erc20.token";
import { PoolHelper, PoolInfo } from "./pool";

const logger = LoggerFactory.getInstance().getLogger('FarmHelper');

export type SeedInfo = {
    seed_id: string;
    seed_type: string,
    farms: string[],
    next_index: number,
    amount: string,
    min_deposit: string,
};

export type FarmInfo = {
    farm_id: string,
    farm_kind: string,
    farm_status: string,
    seed_id: string,
    reward_token: string,
    start_at: number,
    reward_per_session: string,
    session_interval: number,
    total_reward: string,
    cur_round: number,
    last_round: number,
    claimed_reward: string,
    unclaimed_reward: string,
    beneficiary_reward: string
};

export type Receipt = {
    farm: string,
    tvl: TokenBalance[],
    shares: string,
    deposits: TokenBalance[],
    rewards: TokenBalance[],
    pool: PoolInfo
}

export type TokenBalance = {
    token: ERC20Token,
    balance: string
}

const gTokenDB = TokenDB.getInstance(ChainConfig.mainnet);
const gPoolHelper = PoolHelper.getInstance(ChainConfig.mainnet);

export class FarmingHelper {
    private config: ConnectConfig
    private connected: boolean
    private near: Near;
    private defaultAccount: Account;

    constructor(config: ConnectConfig) {
        this.config = config;
        this.connected = false;
    }

    private async checkConnection() {
        if (!this.connected) {
            logger.warn(`checkConnecttion > no connection to Near network.`);
            await this.connectToNetwork()
        }
    }
    /**
     * 从farmId中提取poolId
     * @param farmId 
     * @returns 
     */
    private getPoolId(farmId: string): number {
        return Number.parseInt(farmId.slice(farmId.indexOf('@') + 1, farmId.lastIndexOf('#')));
    }

    public async connectToNetwork() {
        this.near = await connect(this.config);
        this.connected = true;
        logger.info(`connectToNetwork > connected to Near network - ${this.config.networkId}`);
        this.defaultAccount = await this.near.account(Config.account.default);
    }

    public async getSeedInfo(seedId: string): Promise<SeedInfo> {
        await this.checkConnection();
        const seedInfo = await this.defaultAccount.viewFunction(Config.contract.farming, 'get_seed_info', { seed_id: seedId });
        return seedInfo;
    }

    public async listFarmsBySeed(seedId: string): Promise<FarmInfo[]> {
        await this.checkConnection();
        const farms = await this.defaultAccount.viewFunction(Config.contract.farming, 'list_farms_by_seed', { seed_id: seedId });
        return farms;
    }
    //指定farm的目标账户的待领取奖励数量
    public async getClaimableRewards(userAddress: string, farmId: string): Promise<string> {
        await this.checkConnection();
        const account = await this.near.account(userAddress);
        const claimableRewards = await account.viewFunction(Config.contract.farming, 'get_unclaimed_reward', { account_id: account.accountId, farm_id: farmId });
        return claimableRewards;
    }
    /**
     * 获取用户farming seeds列表
     * @param accountId 
     * @returns 
     */
    public async listUserSeeds(accountId: string) {
        await this.checkConnection();
        const account = await this.near.account(accountId);
        const userSeedData = await account.viewFunction(Config.contract.farming, 'list_user_seeds', { account_id: account.accountId });
        return userSeedData;
    }

    public async getFarmTVL(poolId: number): Promise<TokenBalance[]>  {
        const totalStakedShares = await gPoolHelper.getPoolShareBalance(poolId, Config.contract.farming);
        const poolInfo = await gPoolHelper.getPoolInfo(poolId);
        const balances = await gPoolHelper.getPoolBalanceDetails(poolInfo, totalStakedShares);
        return balances;
    }

    public async getUserFarmingReceipts(accountId: string): Promise<Receipt[]> {
        const receipts: Receipt[] = [];
        try {
            await this.checkConnection();
            //获取用户seed和farming share balance
            const userSeedData = await this.listUserSeeds(accountId);
            //根据seedId遍历用户参与的所有farming pools
            //每个seedId对应一个farming pool
            //每个seedId关联多个farm pool items(farms)
            for (const [seedId, shares] of Object.entries(userSeedData)) {
                logger.info(`seed[${seedId}] > shares: ${shares}`);
                //获取seedId关联的所有farming pool items
                const farms = await this.listFarmsBySeed(seedId);
                //console.log(farms);
                if (farms.length > 0) {
                    //从farmId中提取pool id
                    const poolId = this.getPoolId(farms[0].farm_id);
                    //根据poolId获取pool基本信息
                    const poolInfo = await gPoolHelper.getPoolInfo(poolId);
                    logger.info(`seed[${seedId}] > pool[${poolId}]: ${poolInfo.name}`);
                    //根据用户质押份额share的数量，计算用户质押的多个token的数量
                    const userDepositBalances = await gPoolHelper.getPoolBalanceDetails(poolInfo, new BigNumber(String(shares)));
                    //获取目标池子总共质押挖矿的share份额对应的多个token的数量
                    const farmTVLBalances = await this.getFarmTVL(poolId);
                    const receipt: Receipt = {
                        farm: poolInfo.name,
                        tvl: farmTVLBalances,
                        shares: new BigNumber(String(shares)).dividedBy(Math.pow(10, poolInfo.shareDecimals)).toNumber().toFixed(6),
                        deposits: userDepositBalances,
                        rewards: [],
                        pool: poolInfo
                    }
                    //遍历所有farm pool item, 获取多个奖励token的信息
                    for (const farm of farms) {
                        if (farm.farm_status === 'Running') { //只关注当前状态是“Running”的farming pool
                            //获取奖励token的metadata信息
                            const rewardToken = await gTokenDB.syncUp(farm.reward_token);
                            logger.info(`farm[${farm.farm_id}] > reward token - ${rewardToken.symbol}: ${rewardToken.address}`)
                            //获取目标farm里的待领取奖励token的数量
                            const claimableRewards = await this.getClaimableRewards(accountId, farm.farm_id)
                            logger.info(`farm[${farm.farm_id}] > claimable reward - ${rewardToken.symbol}: ${rewardToken.readableAmount(claimableRewards).toFixed(8)}`)
                            receipt.rewards.push({
                                token: rewardToken,
                                balance: rewardToken.readableAmount(claimableRewards).toFixed(8)
                            })
                        }
                    }
                    receipts.push(receipt);
                }
            }
            return receipts
        } catch(e) {
            logger.error(`getUserFarmingReceipts > ${e.message}`);
        }
    }
}

const main = async () => {
    const farmingHelper = new FarmingHelper(ChainConfig.mainnet)
    const receipts = await farmingHelper.getUserFarmingReceipts('4a04621225d430f5939a265d4995c1e6cb60768c1a8e4c7b8a4da1f7fac982ce');
    console.log(JSON.stringify(receipts));
};

main().catch((e) => {
    logger.error(e.message);
});

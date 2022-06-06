import { nodeInteraction } from '@waves/waves-transactions';
import { ERC20Token } from '../../library/erc20.token';
import { LoggerFactory } from '../../library/LoggerFactory';
import { TokenDB } from '../db.token';
import BigNumber from 'bignumber.js';
import { Config } from './Config';

type TokenInfo = {
    token: ERC20Token;
    balance: string;
};

const NodeUrl = Config.nodeURI;
const tokenDB = TokenDB.getInstance();
const logger = LoggerFactory.getInstance().getLogger('utils');

export class Utils {
    //获取金库的凭证token - vToken信息
    public static async getVTokenInfo(vaultAddress: string): Promise<TokenInfo> {
        try {
            const keyOfTokenId = 'aTokenId';
            const keyOfTokenDecimals = 'aTokenDecimals';
            const keyOfTokenName = 'aTokenName';
            const keyOfTokenCirculation = 'aTokenCirculation';

            const vTokenId = await nodeInteraction.accountDataByKey(keyOfTokenId, vaultAddress, NodeUrl);
            let vToken = await tokenDB.getByAddress(vTokenId.value.toString());
            if (!vToken) {
                logger.debug(`getVTokenInfo > token - ${vTokenId.value.toString()} does not exist in token db.`);
                const aTokenName = await nodeInteraction.accountDataByKey(keyOfTokenName, vaultAddress, NodeUrl);
                const aTokenDecimals = await nodeInteraction.accountDataByKey(
                    keyOfTokenDecimals,
                    vaultAddress,
                    NodeUrl,
                );

                vToken = new ERC20Token(
                    vTokenId.value.toString(),
                    aTokenName.value.toString(),
                    Number.parseInt(aTokenDecimals.value.toString()),
                );
                logger.debug(`getVTokenInfo > added token - ${vTokenId.value.toString()} to db.`);
                await tokenDB.syncUp(vToken);
            }
            logger.info(`getVTokenInfo > token - ${vTokenId.value.toString()} already existed in token db.`);
            const totalSupply = await nodeInteraction.accountDataByKey(keyOfTokenCirculation, vaultAddress, NodeUrl);
            return {
                token: vToken,
                balance: totalSupply.value.toString(),
            };
        } catch (e) {
            logger.error(`getVTokenInfo > ${e.toString()}`);
        }
    }
    //获取金库的凭证token与资产token的兑换率
    public static async getExchangeRate(vaultAddress: string): Promise<BigNumber> {
        const vTokenInfo = await Utils.getVTokenInfo(vaultAddress)
        const vTokenSupply = vTokenInfo.balance
        //获取存款总数
        const totalDepositItem = await nodeInteraction.accountDataByKey('totalDeposit', vaultAddress, NodeUrl);
        const totalDepositAssets = new BigNumber(totalDepositItem.value.toString())

        return totalDepositAssets.dividedBy(vTokenSupply)
    }
    //获取平台币vires的价格
    public static async getViresPrice(): Promise<number> {
        const keyBalanceA = 'A_asset_balance';
        const keyBalanceB = 'B_asset_balance';
        const balanceAData = await nodeInteraction.accountDataByKey(keyBalanceA, Config.swopfiPair, NodeUrl);
        const balanceBData = await nodeInteraction.accountDataByKey(keyBalanceB, Config.swopfiPair, NodeUrl);

        const balanceA = new BigNumber(balanceAData.value.toString());
        const balanceB = new BigNumber(balanceBData.value.toString());

        const priceVires = balanceB.multipliedBy(100).dividedBy(balanceA);
        logger.info(`getViresPrice > ${priceVires.toNumber().toFixed(4)} USD`);
        return priceVires.toNumber();
    }
    //获取金库资产token的地址
    public static async getVaultAssetId(vaultAddress: string): Promise<string> {
        const assetIdItem = await nodeInteraction.accountDataByKey('assetId', vaultAddress, NodeUrl)
        return (assetIdItem !== null) === true ? assetIdItem.value.toString() : null
    }
    //获取资产token的价格
    public static async getAssetPrice(assetId: string): Promise<number> {
        const keyPrice = Config.KeyOfPriceMap[assetId];
        if (keyPrice) {
            logger.info(`getAssetPrice > key: ${keyPrice}`);
            if (keyPrice === '%s%s__price__EUR') {
                //EUR
                const priceData = await nodeInteraction.accountDataByKey(keyPrice, Config.eurOracle, NodeUrl);
                return new BigNumber(1000000).dividedBy(priceData.value.toString()).toNumber();
            }
            //其他币种BTC/ETH/Waves
            const priceData = await nodeInteraction.accountDataByKey(keyPrice, Config.oracle, NodeUrl);
            logger.info(`getAssetPrice > ${priceData.value.toString()}`);
            return new BigNumber(priceData.value.toString()).dividedBy(1e6).toNumber();
        } else {
            logger.info(`getAssetPrice > stable coin: ${1} USD`); //稳定币
            return 1;
        }
    }
    //获取资产token信息
    public static async getAssetToken(assetId: string): Promise<ERC20Token> {
        let assetToken : ERC20Token = null
        if(assetId === 'WAVES') {
            assetToken = new ERC20Token('WAVES', 'WAVES', 8)
        } else {
            const assetInfo = await nodeInteraction.transactionById(assetId, NodeUrl)
            assetToken = new ERC20Token(
                assetInfo['assetId'],
                assetInfo['name'],
                Number.parseInt(assetInfo['decimals']),
            )
        }
        await tokenDB.syncUp(assetToken);
        return assetToken;
    }
}
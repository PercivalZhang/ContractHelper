import { nodeInteraction } from '@waves/waves-transactions';
import { create } from "@waves/node-api-js";
import { ERC20Token } from '../../library/erc20.token';
import { LoggerFactory } from '../../library/LoggerFactory';
import { TokenDB } from '../db.token';
import BigNumber from 'bignumber.js';
import { Config } from './Config';
import { Vault } from './vault';
import { Utils } from './utils';

type UserRawReceipt = {
    balance: string;
    unlockHeight: number;
    weightFactor: number;
    claimableRewards: BigNumber;
};

type AccRewardInfo = {
    balance: BigNumber;
    blocks: number;
    speed: number;
}

const NodeUrl = Config.nodeURI;
const tokenDB = TokenDB.getInstance();
const logger = LoggerFactory.getInstance().getLogger('boost');
const API = create(NodeUrl);

export class Boost {
    public address: string;
    public lastHeight: number;

    constructor() {
        this.address = Config.boost;
    }
    public async getVaultBoostInfo(vaultAddress: string) {
        const rewardToken = await tokenDB.syncUp(
            new ERC20Token(Config.Vires.address, Config.Vires.symbol, Config.Vires.decimals),
        );

        const vTokenInfo = await Utils.getVTokenInfo(vaultAddress);
        const vToken = vTokenInfo.token
        logger.info(`getVaultBoostInfo > vToken - ${vToken.symbol}: ${vToken.address}`)

        const keyOfSpeed = vToken.address + '_speed'
        const speedItem = await nodeInteraction.accountDataByKey(keyOfSpeed, this.address, NodeUrl)
        const speed = (speedItem !== null) === true ? Number.parseInt(speedItem.value.toString()) : 0
        logger.info(`getVaultBoostInfo > reward speed: ${speed} per block`)

        const keyOfTotalLockedVToken = vToken.address + '_totalLocked'
        const totalLockedVTokenItem = await nodeInteraction.accountDataByKey(keyOfTotalLockedVToken, this.address, NodeUrl)
        const totalLockedVToken = (totalLockedVTokenItem !== null) === true ? new BigNumber(totalLockedVTokenItem.value.toString()) : new BigNumber(0)
        logger.info(`getVaultBoostInfo > total locked vToken - ${vToken.symbol}: ${vToken.readableAmountFromBN(totalLockedVToken).toFixed(6)}`)

        const exchangeRate = await Utils.getExchangeRate(vaultAddress)
        const totalLockedAssetBalance = totalLockedVToken.multipliedBy(exchangeRate)

        const assetId = await Utils.getVaultAssetId(vaultAddress)
        const assetToken = await Utils.getAssetToken(assetId)
        logger.info(`getVaultBoostInfo > total locked asset - ${assetToken.symbol}: ${assetToken.readableAmountFromBN(totalLockedAssetBalance).toFixed(6)}`)

        const annualRewardTokenBalance = rewardToken.readableAmountFromBN(new BigNumber(speed).multipliedBy(525600))
        const rewardTokenPrice = await Utils.getViresPrice()
        const annualRewardUSD = annualRewardTokenBalance * rewardTokenPrice

        const apr = annualRewardUSD / assetToken.readableAmountFromBN(totalLockedAssetBalance)
        logger.info(`getVaultBoostInfo > apr: ${apr}`)
    }

    public async getVaultAccRewardReceipt(vaultAddress: string): Promise<AccRewardInfo> {
        const rewardToken = await tokenDB.syncUp(
            new ERC20Token(Config.Vires.address, Config.Vires.symbol, Config.Vires.decimals),
        );

        const vTokenInfo = await Utils.getVTokenInfo(vaultAddress);
        const vToken = vTokenInfo.token
        logger.info(`currentRewards > vToken - ${vToken.symbol}: ${vToken.address}`)

        const topBlock = await API.blocks.fetchHeadersLast()
        const blockHeight = topBlock.height
        logger.info(`currentRewards > top block height: ${blockHeight}`)

        const keyOfSyncdHeight = vToken.address + '_syncedHeight'
        const syncHeightItem = await nodeInteraction.accountDataByKey(keyOfSyncdHeight, this.address, NodeUrl)
        const syncHeight = (syncHeightItem !== null) === true ? Number.parseInt(syncHeightItem.value.toString()) : 0
        logger.info(`currentRewards > sync height: ${syncHeight}`)

        const KeyOfRewardStore = vToken.address + '_reward'
        const storedRewardItem = await nodeInteraction.accountDataByKey(KeyOfRewardStore, this.address, NodeUrl)
        const storedReward = (storedRewardItem !== null) === true ? new BigNumber(storedRewardItem.value.toString()) : new BigNumber(0)

        const keyOfSpeed = vToken.address + '_speed'
        const speedItem = await nodeInteraction.accountDataByKey(keyOfSpeed, this.address, NodeUrl)
        const speed = (speedItem !== null) === true ? Number.parseInt(speedItem.value.toString()) : 0
        logger.info(`currentRewards > reward speed: ${speed} per block`)
        logger.info(`currentRewards > delta blockes - ${blockHeight - syncHeight}`)

        const accumulatedReward = new BigNumber(blockHeight - syncHeight).multipliedBy(speed)
        logger.info(`currentRewards > new accumulated rewards - ${rewardToken.symbol}: ${rewardToken.readableAmountFromBN(accumulatedReward).toFixed(6)}`)
        logger.info(`currentRewards > total claimable rewards - ${rewardToken.symbol}: ${rewardToken.readableAmountFromBN(storedReward.plus(accumulatedReward)).toFixed(6)}`)

        const receipt: AccRewardInfo = {
            balance: storedReward.plus(accumulatedReward),
            blocks: blockHeight - syncHeight,
            speed
        }
        return receipt
    }

    //获取用户借贷信息
    public async getUserBoostInfo(userAddress: string, vaultAddress: string): Promise<UserRawReceipt> {
        const rewardToken = await tokenDB.syncUp(
            new ERC20Token(Config.Vires.address, Config.Vires.symbol, Config.Vires.decimals),
        );
        const vTokenInfo = await Utils.getVTokenInfo(vaultAddress);
        const vToken = vTokenInfo.token
        logger.info(`getUserBoostInfo > vault vToken - ${vToken.symbol}: ${vToken.address}`)
        //获取用户固定时间锁仓aToken数量
        const keyOfLockedVToken = userAddress + '_' + vToken.address + '_amt'
        const lockedVTokenBalanceItem = await nodeInteraction.accountDataByKey(keyOfLockedVToken, this.address, NodeUrl)
        if (lockedVTokenBalanceItem) {
            const vTokenBalance = lockedVTokenBalanceItem.value.toString()
            logger.info(
                `getUserBoostInfo > boosted vToken balance: ${vToken
                    .readableAmount(vTokenBalance)
                    .toFixed(4)} ${vToken.symbol}`,
            );
            //用户锁仓的解锁区块高度
            const keyOfUnlockHeight = userAddress + '_' + vToken.address + '_unlockHeight'
            const unlockHeightItem = await nodeInteraction.accountDataByKey(keyOfUnlockHeight, this.address, NodeUrl)
            const unlockHeight = (unlockHeightItem !== null) === true ? Number.parseInt(unlockHeightItem.value.toString()) : 0
            logger.info(
                `getUserBoostInfo > unlock height: ${unlockHeightItem.value.toString()}`
            );
            //用户锁仓加权因子        
            const keyOfWeightFactor = userAddress + '_' + vToken.address + '_weightFactor'
            const weightFactorItem = await nodeInteraction.accountDataByKey(keyOfWeightFactor, this.address, NodeUrl)
            const weightFactor = (weightFactorItem !== null) === true ? Number.parseInt(weightFactorItem.value.toString()) : 0
            logger.info(
                `getUserBoostInfo > weight factor: ${weightFactor}`
            );
            //获取总共加权的锁定vToken余额
            const keyOfTotalWeightedVTokenLocked = vToken.address + '_totalWeightedLocked'
            const totalWeightedVTokenLockedItem = await nodeInteraction.accountDataByKey(keyOfTotalWeightedVTokenLocked, this.address, NodeUrl)
            const totalWeightedVTokenLocked = (totalWeightedVTokenLockedItem !== null) === true ? new BigNumber(totalWeightedVTokenLockedItem.value.toString()) : new BigNumber(0)
            //获取用户加权的锁定vToken的余额    
            const userWeightedBalance = new BigNumber(vTokenBalance).multipliedBy(weightFactor).dividedBy(1000)
            const ratio = userWeightedBalance.dividedBy(totalWeightedVTokenLocked)
            logger.info(`getUserBoostInfo > ratio: ${ratio.toNumber().toFixed(6)}`)
            //计算当前金库锁仓额度累计的待领取奖励
            const vaultAccRewardReceipt = await this.getVaultAccRewardReceipt(vaultAddress)

            const keyOfUserAdjReward = userAddress + '_userRewardAdj_' + vToken.address
            const userAdjRewardItem = await nodeInteraction.accountDataByKey(keyOfUserAdjReward, this.address, NodeUrl)
            const userAdjReward = (userAdjRewardItem !== null) === true ? new BigNumber(userAdjRewardItem.value.toString()) : new BigNumber(0)
            //计算用户锁仓待领取的奖励token的数量    
            let claimableRewards = new BigNumber(0)
            if (totalWeightedVTokenLocked.eq(0)) {
                claimableRewards = userAdjReward
            } else {
                claimableRewards = userAdjReward.plus(vaultAccRewardReceipt.balance.multipliedBy(userWeightedBalance).dividedBy(totalWeightedVTokenLocked))
            }
            logger.info(`getUserBoostInfo > claimable rewards - ${rewardToken.symbol}: ${rewardToken.readableAmountFromBN(claimableRewards).toFixed(6)}`)
            const receipt: UserRawReceipt = {
                balance: vTokenBalance,
                unlockHeight: unlockHeight,
                weightFactor: weightFactor,
                claimableRewards
            }
            return receipt;
        }
        return null;
    }
}

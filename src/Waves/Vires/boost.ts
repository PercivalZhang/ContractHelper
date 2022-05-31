import { nodeInteraction } from '@waves/waves-transactions';
import { create } from "@waves/node-api-js";
import { ERC20Token } from '../../library/erc20.token';
import { LoggerFactory } from '../../library/LoggerFactory';
import { TokenDB } from '../db.token';
import BigNumber from 'bignumber.js';
import { Config } from './Config';
import { Vault } from './vault';

type UserRawReceipt = {
    balance: string;
    unlockHeight: number;
    weightFactor: number;
    claimableRewards: BigNumber;
};


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
    /**
     * func userClaimedStore (assetId,user) = ((user + "_claimed_") + assetId)
     * func userRewardAdjStore (assetId,user) = ((user + "_userRewardAdj_") + assetId)
     */
    public async currentRewards(vaultAddress: string): Promise<BigNumber> {
        const rewardToken = await tokenDB.syncUp(
            new ERC20Token(Config.Vires.address, Config.Vires.symbol, Config.Vires.decimals),
        );

        const vTokenInfo = await Vault.getVTokenInfo(vaultAddress);
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

        if (syncHeight === blockHeight) {
            return storedReward
        }

        const keyOfSpeed = vToken.address + '_speed'
        const speedItem = await nodeInteraction.accountDataByKey(keyOfSpeed, this.address, NodeUrl)
        const speed = (speedItem !== null) === true ? Number.parseInt(speedItem.value.toString()) : 0
        logger.info(`currentRewards > reward speed: ${speed} per block`)
        const accumulatedReward = new BigNumber(blockHeight - syncHeight).multipliedBy(speed)

        logger.info(`currentRewards > current rewards - ${rewardToken.symbol}: ${rewardToken.readableAmountFromBN(storedReward.plus(accumulatedReward)).toFixed(6)}`)
        return storedReward.plus(accumulatedReward)
    }

    //获取用户借贷信息
    public async getUserBoostInfo(userAddress: string, vaultAddress: string): Promise<UserRawReceipt> {

        const rewardToken = await tokenDB.syncUp(
            new ERC20Token(Config.Vires.address, Config.Vires.symbol, Config.Vires.decimals),
        );

        const vTokenInfo = await Vault.getVTokenInfo(vaultAddress);
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
            const keyOfUnlockHeight = userAddress + '_' + vToken.address + '_unlockHeight'
            const unlockHeightItem = await nodeInteraction.accountDataByKey(keyOfUnlockHeight, this.address, NodeUrl)
            const unlockHeight = (unlockHeightItem !== null) === true ? Number.parseInt(unlockHeightItem.value.toString()) : 0
            logger.info(
                `getUserBoostInfo > unlock height: ${unlockHeightItem.value.toString()}`
            );

            const keyOfWeightFactor = userAddress + '_' + vToken.address + '_weightFactor'
            const weightFactorItem = await nodeInteraction.accountDataByKey(keyOfWeightFactor, this.address, NodeUrl)
            const weightFactor = (weightFactorItem !== null) === true ? Number.parseInt(weightFactorItem.value.toString()) : 0
            logger.info(
                `getUserBoostInfo > weight factor: ${weightFactor}`
            );

            const keyOfTotalWeightedVTokenLocked = vToken.address + '_totalWeightedLocked'
            const totalWeightedVTokenLockedItem = await nodeInteraction.accountDataByKey(keyOfTotalWeightedVTokenLocked, this.address, NodeUrl)
            const totalWeightedVTokenLocked = (totalWeightedVTokenLockedItem !== null) === true ? new BigNumber(totalWeightedVTokenLockedItem.value.toString()) : new BigNumber(0)

            const userWeightedBalance = new BigNumber(vTokenBalance).multipliedBy(weightFactor).dividedBy(1000)
            const ratio = userWeightedBalance.dividedBy(totalWeightedVTokenLocked)    
            logger.info(`getUserBoostInfo > ratio: ${ratio.toNumber().toFixed(6)}`)

            const totalRewards = await this.currentRewards(vaultAddress)

            const keyOfUserAdjReward = userAddress + '_userRewardAdj_' + vToken.address
            const userAdjRewardItem = await nodeInteraction.accountDataByKey(keyOfUserAdjReward, this.address, NodeUrl)
            const userAdjReward = (userAdjRewardItem !== null) === true ? new BigNumber(userAdjRewardItem.value.toString()) : new BigNumber(0)

            let accRewards = new BigNumber(0)
            if (totalWeightedVTokenLocked.eq(0)) {
                accRewards = userAdjReward
            } else {
                accRewards = userAdjReward.plus(totalRewards.multipliedBy(userWeightedBalance).dividedBy(totalWeightedVTokenLocked))
            }

            logger.info(`getUserBoostInfo > claimable rewards - ${rewardToken.symbol}: ${rewardToken.readableAmountFromBN(accRewards).toFixed(6)}`)

            const receipt: UserRawReceipt = {
                balance: vTokenBalance,
                unlockHeight: unlockHeight,
                weightFactor: weightFactor,
                claimableRewards: accRewards
            }
            return receipt;
        }
        return null;
    }
}

// const main = async () => {
//     const boost = new Boost()
//     await boost.getUserBoostInfo('3P5V82NzawM19QPrs8JoFFSctzxzjduUQUZ', Config.vaults.usdt);
// };
// main().catch((e) => {
//     console.error(e.message);
// });

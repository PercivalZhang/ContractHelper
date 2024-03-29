import { nodeInteraction } from '@waves/waves-transactions';
import { ERC20Token } from '../../library/erc20.token';
import { LoggerFactory } from '../../library/LoggerFactory';
import { TokenDB } from '../db.token';
import BigNumber from 'bignumber.js';
import { Config } from './Config';
import { Boost } from './boost';
import { Utils } from './utils';

type TokenInfo = {
    token: ERC20Token;
    balance: string;
};
type ConfigInfo = {
    collateralFactor: string;
    liquidationThreshold: string;
    liquidationPenalty: string;
    reserveFactor: string; // protocal share
    aPoint: string;
    bPoint: string;
    cPoint: string;
    dPoint: string;
};
type VaultInfo = {
    asset: ERC20Token;
    aToken: ERC20Token;
    aTokenSupply: string;
    totalDeposit: string;
    totalBorrow: string;
    rewardInfo: RewardInfo;
};
type RewardInfo = {
    borrowRewards: string;
    depositRewards: string;
    borrowRewardSpeed: string;
    depositRewardSpeed: string;
};

const NodeUrl = Config.nodeURI;
const boost = new Boost()
const tokenDB = TokenDB.getInstance();
const logger = LoggerFactory.getInstance().getLogger('vault');

export class Vault {
    public address: string;
    private vToken: ERC20Token;
    private assetToken: ERC20Token;
    private rewardToken: ERC20Token;
    private configAddress: string;
    private config: ConfigInfo;

    constructor(address: string) {
        this.address = address;
    }

    //参考https://docs.vires.finance/faq/asset-parameters
    public static calculateBorrowSupplyAPR(
        utilizationRatio: number,
        a: number,
        b: number,
        c: number,
        d: number,
        reserveFactor: number,
    ): number[] {
        logger.info(`calculateBorrowAPR > ${utilizationRatio}`);
        let borrowAPR = 0.0;
        if (utilizationRatio < b) {
            borrowAPR = a + ((c - a) * utilizationRatio) / b;
        } else {
            borrowAPR = ((d - c) * utilizationRatio) / (1 - b) + (c - b * d) / (1 - b);
        }
        const supplyAPR = borrowAPR * utilizationRatio * (1 - reserveFactor);
        return [borrowAPR, supplyAPR];
    }

    public static async getDepositBorrowRewardInfo(vaultAddress: string): Promise<RewardInfo> {
        const rewardInfo: RewardInfo = {
            borrowRewards: '',
            depositRewards: '',
            borrowRewardSpeed: '',
            depositRewardSpeed: '',
        };
        const keyOfBorrowReward = vaultAddress + '_reward_borrow';
        const borrowRewardData = await nodeInteraction.accountDataByKey(
            keyOfBorrowReward,
            Config.rewardDistributor,
            NodeUrl,
        );
        const borrowRewards = borrowRewardData.value.toString();
        logger.info(`getDepositBorrowRewardInfo > total reward for borrow: ${borrowRewards}`);
        rewardInfo.borrowRewards = borrowRewards;

        const keyOfDepositReward = vaultAddress + '_reward_deposit';
        const depositRewardData = await nodeInteraction.accountDataByKey(
            keyOfDepositReward,
            Config.rewardDistributor,
            NodeUrl,
        );
        const depositRewards = depositRewardData.value.toString();
        logger.info(`getDepositBorrowRewardInfo > total reward for deposit: ${depositRewards}`);
        rewardInfo.depositRewards = depositRewards;

        const keyOfDepositRewardSpeed = vaultAddress + '_speed_deposit';
        const depositRewardSpeedData = await nodeInteraction.accountDataByKey(
            keyOfDepositRewardSpeed,
            Config.rewardDistributor,
            NodeUrl,
        );
        const depositRewardSpeed = depositRewardSpeedData.value.toString();
        logger.info(`getDepositBorrowRewardInfo > deposit reward speed: ${depositRewardSpeed}`);
        rewardInfo.depositRewardSpeed = depositRewardSpeed;

        const keyOfBorrowRewardSpeed = vaultAddress + '_speed_borrow';
        const borrowRewardSpeedData = await nodeInteraction.accountDataByKey(
            keyOfBorrowRewardSpeed,
            Config.rewardDistributor,
            NodeUrl,
        );
        const borrowRewardSpeed = borrowRewardSpeedData.value.toString();
        logger.info(`getDepositBorrowRewardInfo > borrow reward speed: ${borrowRewardSpeed}`);
        rewardInfo.borrowRewardSpeed = borrowRewardSpeed;

        return rewardInfo;
    }

    public getConfig(): ConfigInfo {
        return this.config;
    }

    public async loadBasicInfo() {
        try {
            const assetIdItem = await nodeInteraction.accountDataByKey('assetId', this.address, NodeUrl);
            const assetId = assetIdItem.value.toString();
            if (assetId !== 'WAVES') {
                const assetInfo = await nodeInteraction.transactionById(assetId, NodeUrl);
                console.log(JSON.stringify(assetInfo))
                const assetToken = new ERC20Token(
                    assetInfo['assetId'],
                    assetInfo['name'],
                    Number.parseInt(assetInfo['decimals']),
                );
                this.assetToken = assetToken;
            } else {
                const assetToken = new ERC20Token('WAVES', 'WAVES', 8);
                this.assetToken = assetToken;
            }
            await tokenDB.syncUp(this.assetToken)
            logger.info(`loadBasicInfo > asset - ${this.assetToken.symbol}: ${this.assetToken.address}`);

            const vTokenInfo = await Utils.getVTokenInfo(this.address);
            this.vToken = vTokenInfo.token;
            logger.info(`loadBasicInfo > vToken - ${this.vToken.symbol}: ${this.vToken.address}`);

            this.rewardToken = await tokenDB.syncUp(
                new ERC20Token(Config.Vires.address, Config.Vires.symbol, Config.Vires.decimals),
            );

            const configAddressData = await nodeInteraction.accountDataByKey('configAddress', this.address, NodeUrl);
            const configAddress = configAddressData.value.toString();
            this.configAddress = configAddress;
            logger.info(`loadBasicInfo > config address: ${this.configAddress}`);
        } catch (e) {
            logger.error(`loadBasicInfo > ${e.message}`);
        }
    }

    public async getConfigInfo() {
        try {
            const keyCollateraFactor = this.assetToken.address + '_CollateralFactor';
            const keyLiquidationPenalty = this.assetToken.address + '_LiquidationPenalty';
            const keyLiquidationThreshold = this.assetToken.address + '_LiquidationThreshold';
            const keyReserveFactor = this.assetToken.address + '_ReserveFactor';

            const cFactorData = await nodeInteraction.accountDataByKey(keyCollateraFactor, this.configAddress, NodeUrl);
            const cFactor = new BigNumber(cFactorData.value.toString()).dividedBy(1000);
            logger.info(`getConfigInfo > collateral factor: ${cFactor.multipliedBy(100).toNumber().toFixed(2)}%`);

            const liqPenaltyData = await nodeInteraction.accountDataByKey(
                keyLiquidationPenalty,
                this.configAddress,
                NodeUrl,
            );
            const liqPenalty = new BigNumber(liqPenaltyData.value.toString()).dividedBy(1000);
            logger.info(`getConfigInfo > liquidation penalty: ${liqPenalty.multipliedBy(100).toNumber().toFixed(2)}%`);

            const liqThresholdData = await nodeInteraction.accountDataByKey(
                keyLiquidationThreshold,
                this.configAddress,
                NodeUrl,
            );
            const liqThreshold = new BigNumber(liqThresholdData.value.toString()).dividedBy(1000);
            logger.info(
                `getConfigInfo > liquidation threshold: ${liqThreshold.multipliedBy(100).toNumber().toFixed(2)}%`,
            );

            const reserveFactorData = await nodeInteraction.accountDataByKey(
                keyReserveFactor,
                this.configAddress,
                NodeUrl,
            );
            const reserveFactor = new BigNumber(reserveFactorData.value.toString()).dividedBy(1000);
            logger.info(`getConfigInfo > reserve factor: ${reserveFactor.multipliedBy(100).toNumber().toFixed(2)}%`);

            const keyAPoint = this.assetToken.address + '_APoint';
            const keyBPoint = this.assetToken.address + '_BPoint';
            const keyCPoint = this.assetToken.address + '_CPoint';
            const keyDPoint = this.assetToken.address + '_DPoint';

            const aPointData = await nodeInteraction.accountDataByKey(keyAPoint, this.configAddress, NodeUrl);
            const aPoint = new BigNumber(aPointData.value.toString()).dividedBy(1000).toNumber().toFixed(2);
            logger.info(`getConfigInfo > A point: ${aPoint}`);
            const bPointData = await nodeInteraction.accountDataByKey(keyBPoint, this.configAddress, NodeUrl);
            const bPoint = new BigNumber(bPointData.value.toString()).dividedBy(1000).toNumber().toFixed(2);
            logger.info(`getConfigInfo > B point: ${bPoint}`);
            const cPointData = await nodeInteraction.accountDataByKey(keyCPoint, this.configAddress, NodeUrl);
            const cPoint = new BigNumber(cPointData.value.toString()).dividedBy(1000).toNumber().toFixed(2);
            logger.info(`getConfigInfo > C point: ${cPoint}`);
            const dPointData = await nodeInteraction.accountDataByKey(keyDPoint, this.configAddress, NodeUrl);
            const dPoint = new BigNumber(dPointData.value.toString()).dividedBy(1000).toNumber().toFixed(2);
            logger.info(`getConfigInfo > D point: ${dPoint}`);
            const configInfo: ConfigInfo = {
                collateralFactor: cFactor.toNumber().toFixed(2),
                liquidationThreshold: liqThreshold.toNumber().toFixed(2),
                liquidationPenalty: liqPenalty.toNumber().toFixed(2),
                reserveFactor: reserveFactor.toNumber().toFixed(2),
                aPoint,
                bPoint,
                cPoint,
                dPoint,
            };
            this.config = configInfo;
            return configInfo;
        } catch (e) {
            logger.error(`getConfigInfo > ${e.message}`);
        }
    }

    public async getVaultInfo(): Promise<VaultInfo> {
        const vaultInfo: VaultInfo = {
            asset: undefined,
            aToken: undefined,
            aTokenSupply: '',
            totalDeposit: '',
            totalBorrow: '',
            rewardInfo: null,
        };
        if (!this.assetToken) {
            const assetId = await Utils.getVaultAssetId(this.address)
            const assetToken = await Utils.getAssetToken(assetId)
            vaultInfo.asset = assetToken;
            this.assetToken = assetToken;
        } else {
            vaultInfo.asset = this.assetToken;
        }
        logger.info(`getVaultInfo > asset - ${this.assetToken.symbol}: ${this.assetToken.address}`)
        //获取凭证token - vToken信息
        const vTokenInfo = await Utils.getVTokenInfo(this.address);
        vaultInfo.aToken = vTokenInfo.token;
        vaultInfo.aTokenSupply = vTokenInfo.balance;
        logger.info(`getVaultInfo > vToken - ${vTokenInfo.token.symbol}: ${vTokenInfo.token.address}`);
        //获取存款总数
        const totalDepositItem = await nodeInteraction.accountDataByKey('totalDeposit', this.address, NodeUrl);
        const totalDeposit = new BigNumber(totalDepositItem.value.toString());
        vaultInfo.totalDeposit = totalDeposit.toString();
        logger.info(
            `getVaultInfo > total deposit: ${this.assetToken.readableAmountFromBN(totalDeposit).toFixed(4)} ${
                this.assetToken.symbol
            }`,
        );
        //获取借款总数
        const totalBorrowItem = await nodeInteraction.accountDataByKey('totalBorrow', this.address, NodeUrl);
        const totalBorrow = new BigNumber(totalBorrowItem.value.toString());
        vaultInfo.totalBorrow = totalBorrow.toString();
        logger.info(
            `getVaultInfo > total borrowed: ${this.assetToken.readableAmountFromBN(totalBorrow).toFixed(4)} ${
                this.assetToken.symbol
            }`,
        );
        //获取资产token的价格
        const priceAsset = await Utils.getAssetPrice(this.assetToken.address);
        logger.info(`getVaultInfo > asset - ${this.assetToken.symbol} price: ${priceAsset.toFixed(4)} USD`);
        //该池子的资金使用率
        const utilizationRatio = totalBorrow.dividedBy(totalDeposit);
        logger.info(
            `getVaultInfo > current utilization ratio: ${utilizationRatio.multipliedBy(100).toNumber().toFixed(4)}%`,
        );
        //计算存借款利息产生的收益APR
        const [borrowAPR, supplyAPR] = Vault.calculateBorrowSupplyAPR(
            utilizationRatio.toNumber(),
            Number.parseFloat(this.config.aPoint),
            Number.parseFloat(this.config.bPoint),
            Number.parseFloat(this.config.cPoint),
            Number.parseFloat(this.config.dPoint),
            Number.parseFloat(this.config.reserveFactor),
        );
        logger.info(`getVaultInfo > borrow APR: ${(borrowAPR * 100).toFixed(2)}%`);
        logger.info(`getVaultInfo > supply/lend APR: ${(supplyAPR * 100).toFixed(2)}%`);
        //获取池子的奖励信息
        const rewardInfo = await Vault.getDepositBorrowRewardInfo(this.address);
        vaultInfo.rewardInfo = rewardInfo;
        const priceVires = await Utils.getViresPrice();
        //计算存款的挖矿APR
        const supplyViresAPR = new BigNumber(rewardInfo.depositRewardSpeed)
            .multipliedBy(3600 * 24 * 365)
            .multipliedBy(priceVires)
            .dividedBy(60)
            .dividedBy(this.assetToken.readableAmountFromBN(totalDeposit))
            .dividedBy(priceAsset)
            .dividedBy(1e8);
        logger.info(
            `getVaultInfo > Vires Reward for Supply. APR: ${supplyViresAPR.multipliedBy(100).toNumber().toFixed(2)}%`,
        );
        //计算借款的APR
        const borrowViresAPR = new BigNumber(rewardInfo.borrowRewardSpeed)
            .multipliedBy(3600 * 24 * 365)
            .multipliedBy(priceVires)
            .dividedBy(60)
            .dividedBy(this.assetToken.readableAmountFromBN(totalBorrow))
            .dividedBy(priceAsset)
            .dividedBy(1e8);
        logger.info(
            `getVaultInfo > Vires Reward for Borrow. APR: ${borrowViresAPR.multipliedBy(100).toNumber().toFixed(2)}%`,
        );
        return vaultInfo;
    }
    //获取用户借款余额
    public async getUserDebtBalance(userAddress: string): Promise<BigNumber> {
        //获取当前vault中的借款数量
        const keyOfDebt = userAddress + '_debt';
        const debtAssetBalanceItem = await nodeInteraction.accountDataByKey(keyOfDebt, this.address, NodeUrl);
        if (debtAssetBalanceItem) {
            //获取currentIndex
            const keyOfCurrentIndex = 'storedIndex';
            const currentIdexItem = await nodeInteraction.accountDataByKey(keyOfCurrentIndex, this.address, NodeUrl);
            //获取用户Index
            const keyOfUserIndex = userAddress + '_index';
            const userIdexItem = await nodeInteraction.accountDataByKey(keyOfUserIndex, this.address, NodeUrl);

            const debtBalance = new BigNumber(debtAssetBalanceItem.value.toString())
                .multipliedBy(currentIdexItem.value.toString())
                .dividedBy(userIdexItem.value.toString());
            return debtBalance;
        }
        return new BigNumber(0);
    }
    //获取用户借贷信息
    public async getMaxWithdrawableAmount(): Promise<BigNumber> {
        const keyOfTotalDebtStore = "totalBorrow"
        const totalDebtItem = await nodeInteraction.accountDataByKey(keyOfTotalDebtStore, this.address, NodeUrl)
        const totalDebt = (totalDebtItem !== null) === true ? new BigNumber(totalDebtItem.value.toString()) : new BigNumber(0)
        
        const keyOfTotalDepositStore = "totalDeposit"
        const totalDepositItem = await nodeInteraction.accountDataByKey(keyOfTotalDepositStore, this.address, NodeUrl)
        const totalDeposit = (totalDepositItem !== null) === true ? new BigNumber(totalDepositItem.value.toString()) : new BigNumber(0)
        
        const keyOfTotalReserveStore = "totalReserve"
        const totalReserveItem = await nodeInteraction.accountDataByKey(keyOfTotalReserveStore, this.address, NodeUrl)
        const totalReserve = (totalReserveItem !== null) === true ? new BigNumber(totalReserveItem.value.toString()) : new BigNumber(0)

        return totalDeposit.plus(totalReserve).minus(totalDebt)
    }
    //获取用户借贷信息
    public async getUserInfo(userAddress: string) {
        const vaultInfo = await this.getVaultInfo();
        const assetToken = this.assetToken;
        const vToken = this.vToken;
        //获取用户存款未锁仓的vToken数量
        const keyOfUnlockVTokenBalance = userAddress + '_aTokenBalance';
        const unlockVTokenBalanceItem = await nodeInteraction.accountDataByKey(keyOfUnlockVTokenBalance, this.address, NodeUrl)
        //获取用户参加锁仓boost的vToken的数量
        const userLockedReceipt = await boost.getUserBoostInfo(userAddress, this.address)

        let unlockVTokenBalance = new BigNumber(0)
        if (unlockVTokenBalanceItem) {
            unlockVTokenBalance = unlockVTokenBalance.plus(unlockVTokenBalanceItem.value.toString())
        }  
        let lockedVTokenBalance = new BigNumber(0)
        if (userLockedReceipt) {
            lockedVTokenBalance = lockedVTokenBalance.plus(userLockedReceipt.balance)
        }  
        logger.info(
            `getUserInfo > unlock vToken balance: ${vToken
                .readableAmountFromBN(unlockVTokenBalance)
                .toFixed(4)} ${vToken.symbol}`,
        );
        logger.info(
            `getUserInfo > locked vToken balance: ${vToken
                .readableAmountFromBN(lockedVTokenBalance)
                .toFixed(4)} ${vToken.symbol}`,
        );
        if(unlockVTokenBalance.gt(0) || lockedVTokenBalance.gt(0)) {
            //计算assetToken和vToken的兑换关系
            const assetPerVToken = await Utils.getExchangeRate(this.address)
            const unlockAssetTokenBalance = assetPerVToken.multipliedBy(unlockVTokenBalance)
            const totalAssetTokenBalance = assetPerVToken.multipliedBy(unlockVTokenBalance.plus(lockedVTokenBalance));
            logger.info(
                `getUserInfo > supply asset balance: ${assetToken
                    .readableAmount(totalAssetTokenBalance.toString())
                    .toFixed(5)} ${assetToken.symbol}`
            );
            //获取用户是否将资产启用抵押
            const keyOfUseAsCollateral = userAddress + '_useAsCollateral'
            let useAsCollateral = await nodeInteraction.accountDataByKey(keyOfUseAsCollateral, this.address, NodeUrl)
            logger.info(`getUserInfo > use as collateral: ${useAsCollateral.value}`)
            //结合未锁仓vToken的数量，显示实际collatera标志        
            if(unlockVTokenBalance.gt(0) && useAsCollateral.value) {
                logger.info(`getUserInfo > available assets as collateral: ${true}`)
            } else {
                logger.info(`getUserInfo > available assets as collateral: ${false}`)
            }
            //获取该金库的奖励情况
            const rewardData = vaultInfo.rewardInfo;
            /*
             * 计算提供存款可领取的奖励
             * accReward - claimedReward
             */
            //获取已经领取的奖励数量
            const keyOfClaimedReward = this.address + '_claimed_' + userAddress;
            const claimedRewardData = await nodeInteraction.accountDataByKey(
                keyOfClaimedReward,
                Config.rewardDistributor,
                NodeUrl,
            );
            let claimedRewards = new BigNumber(0);
            if (claimedRewardData) {
                console.log('claimed reward');
                console.log(claimedRewardData.value);
                claimedRewards = new BigNumber(claimedRewardData.value.toString());
            }
            const keyOfAccDepositReward = this.address + '_userRewardAdj_deposit_' + userAddress;
            const accDepositRewardData = await nodeInteraction.accountDataByKey(
                keyOfAccDepositReward,
                Config.rewardDistributor,
                NodeUrl,
            );
            //计算用户存款奖励
            //一定要用unlock asset token balance
            let accRewardForSupply = new BigNumber(rewardData.depositRewards)
                .multipliedBy(unlockAssetTokenBalance)
                .dividedBy(vaultInfo.totalDeposit)
            if (accDepositRewardData) {
                accRewardForSupply = accRewardForSupply.plus(accDepositRewardData.value.toString());
            }
            logger.info(
                `getUserInfo > accumulated reward for supply: ${this.rewardToken
                    .readableAmountFromBN(accRewardForSupply)
                    .toFixed(10)} ${this.rewardToken.symbol}`,
            );
            let accRewardForBorrow = new BigNumber(0);
            //获取当前vault中的借款数量
            //const keyOfDebt = userAddress + '_debt';
            //const debtAssetBalanceItem = await nodeInteraction.accountDataByKey(keyOfDebt, this.address, NodeUrl);
            const userDebtBalance = await this.getUserDebtBalance(userAddress);
            //有借款
            if (userDebtBalance.gt(0)) {
                logger.info(
                    `getUserInfo > debt asset balance: ${assetToken.readableAmountFromBN(userDebtBalance).toFixed(6)} ${
                        assetToken.symbol
                    }`,
                );
                //计算借款产生的可领取奖励
                const keyOfAccBorrowReward = this.address + '_userRewardAdj_borrow_' + userAddress;
                const accBorrowRewardData = await nodeInteraction.accountDataByKey(
                    keyOfAccBorrowReward,
                    Config.rewardDistributor,
                    NodeUrl,
                );
                accRewardForBorrow = new BigNumber(rewardData.borrowRewards)
                    .multipliedBy(userDebtBalance)
                    .dividedBy(vaultInfo.totalBorrow);
                console.log(accRewardForBorrow.toNumber().toFixed(10));
                if (accBorrowRewardData) {
                    console.log(accBorrowRewardData.value.toString());
                    accRewardForBorrow = accRewardForBorrow.plus(accBorrowRewardData.value.toString());
                }
                logger.info(
                    `getUserInfo > accumulated reward for borrow: ${this.rewardToken
                        .readableAmountFromBN(accRewardForBorrow)
                        .toFixed(10)} ${this.rewardToken.symbol}`,
                );
            }
            const totalAccRewards = BigNumber.max(0, accRewardForSupply.plus(accRewardForBorrow));
            const availableRewards = BigNumber.max(0, totalAccRewards.minus(claimedRewards));
            logger.info(
                `getUserInfo > total accumulated rewards: ${this.rewardToken
                    .readableAmountFromBN(totalAccRewards)
                    .toFixed(10)} ${this.rewardToken.symbol}`,
            );
            logger.info(
                `getUserInfo > available rewards: ${this.rewardToken
                    .readableAmountFromBN(availableRewards)
                    .toFixed(10)} ${this.rewardToken.symbol}`,
            );
        }
    }
}

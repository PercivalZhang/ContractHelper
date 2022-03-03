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
    public static async getAssetPrice(assetId: string): Promise<number> {
        const keyPrice = Config.KeyOfPriceMap[assetId];
        if (keyPrice) {
            logger.info(`getAssetPrice > key: ${keyPrice}`);
            if (keyPrice === '%s%s__price__EUR') {//EUR
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

    public static async getAssetInfo(assetId: string): Promise<ERC20Token> {
        const assetInfo = await nodeInteraction.transactionById(assetId, NodeUrl);
        const assetToken = new ERC20Token(
            assetInfo['assetId'],
            assetInfo['name'],
            Number.parseInt(assetInfo['decimals']),
        );
        await tokenDB.syncUp(assetToken);
        return assetToken;
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

    private async getVTokenInfo(): Promise<TokenInfo> {
        const keyOfTokenId = 'aTokenId';
        const keyOfTokenDecimals = 'aTokenDecimals';
        const keyOfTokenName = 'aTokenName';
        const keyOfTokenCirculation = 'aTokenCirculation';

        const vTokenId = await nodeInteraction.accountDataByKey(keyOfTokenId, this.address, NodeUrl);
        let vToken = await tokenDB.getByAddress(vTokenId.value.toString());
        if (!vToken) {
            logger.debug(`getVTokenInfo > token - ${vTokenId.value.toString()} does not exist in token db.`);
            const aTokenName = await nodeInteraction.accountDataByKey(keyOfTokenName, this.address, NodeUrl);
            const aTokenDecimals = await nodeInteraction.accountDataByKey(keyOfTokenDecimals, this.address, NodeUrl);

            vToken = new ERC20Token(
                vTokenId.value.toString(),
                aTokenName.value.toString(),
                Number.parseInt(aTokenDecimals.value.toString()),
            );
            logger.debug(`getVTokenInfo > added token - ${vTokenId.value.toString()} to db.`);
            await tokenDB.syncUp(vToken);
        }
        logger.info(`getVTokenInfo > token - ${vTokenId.value.toString()} already existed in token db.`);
        const totalSupply = await nodeInteraction.accountDataByKey(keyOfTokenCirculation, this.address, NodeUrl);
        return {
            token: vToken,
            balance: totalSupply.value.toString(),
        };
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
            logger.info(`loadBasicInfo > asset - ${this.assetToken.symbol}: ${this.assetToken.address}`);

            const vTokenInfo = await this.getVTokenInfo();
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
            const assetIdItem = await nodeInteraction.accountDataByKey('assetId', this.address, NodeUrl);
            const assetId = assetIdItem.value.toString();
            const assetToken = await Vault.getAssetInfo(assetId);
            vaultInfo.asset = assetToken;
            this.assetToken = assetToken;
        } else {
            vaultInfo.asset = this.assetToken;
        }
        logger.info(`getVaultInfo > asset - ${this.assetToken.symbol}: ${this.assetToken.address}`);
        const vTokenInfo = await this.getVTokenInfo();
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
        const priceAsset = await Vault.getAssetPrice(this.assetToken.address);
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
        //计算存款的挖矿APR    
        const supplyViresAPR = new BigNumber(rewardInfo.depositRewardSpeed)
            .multipliedBy(3600 * 24 * 365)
            .dividedBy(this.assetToken.readableAmountFromBN(totalDeposit))
            .dividedBy(priceAsset)
            .dividedBy(1e8);
        logger.info(
            `getVaultInfo > Vires Reward for Supply. APR: ${supplyViresAPR.multipliedBy(100).toNumber().toFixed(2)}%`,
        );
        //计算借款的APR    
        const borrowViresAPR = new BigNumber(rewardInfo.borrowRewardSpeed)
            .multipliedBy(3600 * 24 * 365)
            .dividedBy(this.assetToken.readableAmountFromBN(totalBorrow))
            .dividedBy(priceAsset)
            .dividedBy(1e8);
        logger.info(
            `getVaultInfo > Vires Reward for Borrow. APR: ${borrowViresAPR.multipliedBy(100).toNumber().toFixed(2)}%`,
        );
        return vaultInfo;
    }

    public async getUserInfo(userAddress: string) {
        const vaultInfo = await this.getVaultInfo();
        const assetToken = this.assetToken;
        const vToken = this.vToken;
        //获取用户存款aToken数量
        const keyOfATokenBalance = userAddress + '_aTokenBalance';
        const aTokenBalanceItem = await nodeInteraction.accountDataByKey(keyOfATokenBalance, this.address, NodeUrl);
        if(aTokenBalanceItem) {
            const aTokenBalance = aTokenBalanceItem.value.toString();
            logger.info(
                `getUserInfo > vToken balance: ${vToken.readableAmount(aTokenBalanceItem.value.toString()).toFixed(4)} ${
                    vToken.symbol
                }`,
            );
            //计算assetToken和vToken的兑换关系    
            const assetPerVToken = new BigNumber(vaultInfo.totalDeposit).dividedBy(vaultInfo.aTokenSupply);
            const assetTokenBalance = assetPerVToken.multipliedBy(aTokenBalance);
            logger.info(
                `getUserInfo > supply asset balance: ${assetToken.readableAmount(assetTokenBalance.toString()).toFixed(5)} ${
                    assetToken.symbol
                }`,
            );
            //获取用户是否将资产启用抵押    
            const keyOfUseAsCollateral = userAddress + '_useAsCollateral';
            let useAsCollateral = await nodeInteraction.accountDataByKey(keyOfUseAsCollateral, this.address, NodeUrl);
            logger.info(`getUserInfo > use as collateral: ${useAsCollateral.value}`);
            //获取该金库的奖励情况    
            const rewardData = vaultInfo.rewardInfo;
            //计算提供存款可领取的奖励
            const pendingRewardForSupply = new BigNumber(rewardData.depositRewards)
                .multipliedBy(assetTokenBalance)
                .dividedBy(vaultInfo.totalDeposit)
                .dividedBy(1e2);
            logger.info(
                `getVaultInfo > pending reward for supply: ${this.rewardToken
                    .readableAmountFromBN(pendingRewardForSupply)
                    .toFixed(7)} ${this.rewardToken.symbol}`,
            );    
            //获取当前vault中的借款数量
            const keyOfDebt = userAddress + '_debt';
            const debtAssetBalanceItem = await nodeInteraction.accountDataByKey(keyOfDebt, this.address, NodeUrl);
            //有借款
            if(debtAssetBalanceItem) {
                const debtAssetBalance = assetToken.readableAmount(debtAssetBalanceItem.value.toString());
                logger.info(`getUserInfo > debt asset balance: ${debtAssetBalance.toFixed(4)} ${assetToken.symbol}`);
                //计算借款产生的可领取奖励
                const pendingRewardForBorrow = new BigNumber(rewardData.borrowRewards)
                .multipliedBy(debtAssetBalance)
                .dividedBy(vaultInfo.totalBorrow)
                .dividedBy(1e2);
                logger.info(
                    `getVaultInfo > pending reward for borrow: ${this.rewardToken
                        .readableAmountFromBN(pendingRewardForBorrow)
                        .toFixed(7)} ${this.rewardToken.symbol}`,
                );  
            }     
        } 
    }
}

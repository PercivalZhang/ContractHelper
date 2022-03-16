import { ContractHelper } from '../../library/contract.helper';
import { LoggerFactory } from '../../library/LoggerFactory';
import { SwissKnife } from '../../library/swiss.knife';
import { MasterChefHelper } from '../../library/master.chef';
import BigNumber from 'bignumber.js';
import { Config } from './config';

const swissKnife = new SwissKnife(Config.network);
const logger = LoggerFactory.getInstance().getLogger('farm');
const poolManager = new ContractHelper(Config.poolManager, './Avalanche/platypus/pool.manager.json', Config.network);
const priceOracle = new ContractHelper(Config.priceOracle, './Avalanche/platypus/price.oracle.json', Config.network);

export class PlatypusChef extends MasterChefHelper {
    private async handlePendingReward(pid: number, pendingRewardData: any) {
        const pendingRwardPTP = new BigNumber(pendingRewardData['0']);
        const ptpToken = await swissKnife.syncUpTokenDB(Config.ptp);
        logger.info(
            `pool[${pid}] > pending rewards: ${pendingRwardPTP
                .dividedBy(Math.pow(10, ptpToken.decimals))
                .toNumber()
                .toFixed(8)} ${ptpToken.symbol}`,
        );
    }
  
    private async handleLPT(pid: number, lpTokenAddress: string, lptBalance: BigNumber) {
        const lpTokenHelper = new ContractHelper(lpTokenAddress, './Avalanche/platypus/lp.token.json', Config.network);
        const lpToken = await swissKnife.syncUpTokenDB(lpTokenAddress);
        logger.info(
            `pid[${pid}] > staked lp token balance: ${lpToken.readableAmount(lptBalance.toNumber().toString())} ${
                lpToken.symbol
            }`,
        );
        const underlyingTokenAddress = await lpTokenHelper.callReadMethod('underlyingToken');
        const underlyingToken = await swissKnife.syncUpTokenDB(underlyingTokenAddress);
        const underlyingTokenBalanceData = await poolManager.callReadMethod(
            'quotePotentialWithdraw',
            underlyingTokenAddress,
            lptBalance.toNumber(),
        );
        logger.info(
            `pid[${pid}] > underlying token balance: ${underlyingToken.readableAmount(underlyingTokenBalanceData['0'])} ${
                underlyingToken.symbol
            }`,
        );
    };

    private async calculateLPTWithdrawBalance(lpTokenAddress: string, lptBalance: BigNumber): Promise<BigNumber> {
        const lpTokenHelper = new ContractHelper(lpTokenAddress, './Avalanche/platypus/lp.token.json', Config.network);
        const lpToken = await swissKnife.syncUpTokenDB(lpTokenAddress);
        logger.info(`lp token balance: ${lpToken.readableAmount(lptBalance.toNumber().toString())} ${lpToken.symbol}`);
        const underlyingTokenAddress = await lpTokenHelper.callReadMethod('underlyingToken');
        const underlyingToken = await swissKnife.syncUpTokenDB(underlyingTokenAddress);
        const underlyingTokenBalanceData = await poolManager.callReadMethod(
            'quotePotentialWithdraw',
            underlyingTokenAddress,
            lptBalance.toNumber(),
        );
        logger.info(
            `underlying token balance: ${underlyingToken.readableAmount(underlyingTokenBalanceData['0'])} ${
                underlyingToken.symbol
            }`,
        );
        return new BigNumber(underlyingTokenBalanceData['0']);
    };

    public async getFarmingReceipts(userAddress: string) {
        await super.getFarmingReceiptsWithCallbacks(
            userAddress,
            this.handleLPT,
            this.handlePendingReward,
        );
    }
    /**
     * 计算池子每年奖励PTP Token的数量
     * - base奖励: 没有质押PTP
     * - boosted奖励：质押PTP，获取vePTP加成的奖励
     * @param pid
     * @param isBoosted true: Boosted奖励 | false: Base奖励
     * @returns
     */
    public async getPoolAnnualRewardPTPAmount(poolAllocPoint:string, isBoosted: boolean): Promise<number> {
        const ptpToken = await swissKnife.syncUpTokenDB(Config.ptp);
        
        const ptpPerSecond = await this.chef.callReadMethod('ptpPerSec');
        logger.info(`getPoolAnnualPtpReward > pool allocPoint: ${poolAllocPoint}`);

        const totalAllocPoint = await this.chef.callReadMethod(this.chefMetadata.methods.totalAllocPoint);
        logger.info(`getPoolAnnualPtpReward > total allocPoint: ${totalAllocPoint}`);

        const dialutingRepartition = await this.chef.callReadMethod('dialutingRepartition');
        const nonDialutingRepartition = await this.chef.callReadMethod('nonDialutingRepartition');

        const allPoolsAnnualPtpReward = new BigNumber(ptpPerSecond).multipliedBy(3600).multipliedBy(24).multipliedBy(365);
        const poolAnnualPtpReward = allPoolsAnnualPtpReward.multipliedBy(poolAllocPoint).dividedBy(totalAllocPoint);

        let repartition = dialutingRepartition; //base奖励的占比份额
        if (isBoosted) {
            repartition = nonDialutingRepartition; //boosted奖励的占比份额
        }
        let totalAnnualPtp = poolAnnualPtpReward.multipliedBy(repartition).dividedBy(1000);
        logger.info(`getPoolAnnualPtpReward > pool annual reward PTP: ${ptpToken.readableAmountFromBN(totalAnnualPtp).toFixed(4)}`);
        return ptpToken.readableAmountFromBN(totalAnnualPtp);
    };
    /**
     * 计算质押池base APR
     * @param pid 池子编号
     */
    public async getPoolBaseAPR(pid: number) {
        const poolInfo = await this.chef.callReadMethod(this.chefMetadata.methods.poolInfo, pid);
        const allocPoint = poolInfo[this.chefMetadata.pool.allocPoint];
        logger.info(`getPoolBaseAPR > pool allocPoint: ${allocPoint}`);

        const poolAnnualRewards = await this.getPoolAnnualRewardPTPAmount(allocPoint, false);

        const assetTokenAddress = poolInfo[this.chefMetadata.pool.lpToken];
        const assetToken = await swissKnife.syncUpTokenDB(assetTokenAddress);
        logger.info(`getPoolBaseAPY > asset token - ${assetToken.symbol}: ${assetToken.address}`);

        const assetTokenHelper = new ContractHelper(assetTokenAddress, './Avalanche/platypus/lp.token.json', Config.network);
        //const totalStakedAsset = await assetTokenHelper.callReadMethod('balanceOf', Config.farmChef.address);
        const totalAssetBalance = await assetTokenHelper.callReadMethod('totalSupply');
        logger.info(`getPoolBaseAPY > total deposit asset - ${assetToken.symbol}: ${assetToken.readableAmount(totalAssetBalance)}`);

        const underlyingTokenAddress = await assetTokenHelper.callReadMethod('underlyingToken');
        const underlyingToken = await swissKnife.syncUpTokenDB(underlyingTokenAddress);
        const priceAsset = await priceOracle.callReadMethod('getAssetPrice', underlyingTokenAddress);
        logger.info(`getPoolBaseAPY > asset - ${assetToken.symbol} price: ${priceAsset}`);

        const poolTAG = `pool[${pid}] - ${underlyingToken.symbol}`;
        const poolStakedTVLUSD = new BigNumber(priceAsset)
            .multipliedBy(totalAssetBalance)
            .dividedBy(1e8)
            .dividedBy(Math.pow(10, assetToken.decimals));
        logger.info(`getPoolBaseAPY > total deposit asset - ${assetToken.symbol} value: ${poolStakedTVLUSD} USD`);

        logger.info(`getPoolBaseAPY > PTP price: ${Config.ptpPrice}`);    
        const poolAnnualRewardUSD = new BigNumber(poolAnnualRewards).multipliedBy(Config.ptpPrice);

        const apr = poolAnnualRewardUSD.dividedBy(poolStakedTVLUSD);
        logger.info(`getPoolBaseAPY > ${poolTAG} > base APR: ${apr.multipliedBy(100).toNumber().toFixed(4)}%`);
    };

    //计算用户Boosted APR
    public async getUserBoostedAPR(pid: number, userAddress: string) {
        const ptpToken = await swissKnife.syncUpTokenDB(Config.ptp);
        
        const poolInfo = await this.chef.callReadMethod(this.chefMetadata.methods.poolInfo, pid);
        const allocPoint = poolInfo[this.chefMetadata.pool.allocPoint];
        logger.info(`getUserBoostedAPR > pool allocPoint: ${allocPoint}`);
        
        //获取质押池每年奖励PTP Token的数量
        //true：计算Boosted APR
        //false: 计算Base APR
        const poolAnnualReward = await this.getPoolAnnualRewardPTPAmount(allocPoint, true);
        logger.info(`getUserBoostedAPR > pool[${pid}] > annual reward: ${poolAnnualReward} ${ptpToken.symbol}`);
        //计算质押池每年奖励PTP Token的USD价值
        const poolAnnualRewardUSD = new BigNumber(poolAnnualReward).multipliedBy(Config.ptpPrice);
        //获取用户质押信息
        const userInfo = await this.chef.callReadMethod(this.chefMetadata.methods.userInfo, pid, userAddress);
        //用户质押的asset token(LPT)数量
        const userAssetTokenBalance = userInfo['amount'];
        //用户boosted因子
        const userFactor = userInfo['factor'];

        //获取池子信息
        const assetTokenAddress = poolInfo['lpToken'];
        const assetToken = await swissKnife.syncUpTokenDB(assetTokenAddress);
        const assetTokenHelper = new ContractHelper(assetTokenAddress, './Avalanche/platypus/lp.token.json', Config.network);
        const underlyingTokenAddress = await assetTokenHelper.callReadMethod('underlyingToken');
        const underlyingToken = await swissKnife.syncUpTokenDB(underlyingTokenAddress);
        //获取asset token的预言机价格
        const priceAsset = await priceOracle.callReadMethod('getAssetPrice', underlyingTokenAddress);
        //获取池子累加boosted因子
        const poolSumFactors = poolInfo['sumOfFactors'];
        const poolTAG = `pool[${pid}] - ${underlyingToken.symbol}`;
        //计算用户每年奖励PTP Token的USD价值
        const userAnnualRewardUSD = poolAnnualRewardUSD.multipliedBy(userFactor).dividedBy(poolSumFactors);
        //计算用户质押资产的USD价值
        const userTVLUSD = new BigNumber(userAssetTokenBalance)
            .multipliedBy(priceAsset)
            .dividedBy(1e8)
            .dividedBy(Math.pow(10, assetToken.decimals));
        logger.info(`getUserBoostedAPR > ${poolTAG} > account[${userAddress}] TVL: ${userTVLUSD.toNumber().toFixed(6)} USD`);
        //计算用户Boosted APR
        const apr = userAnnualRewardUSD.dividedBy(userTVLUSD);
        logger.info(`getUserBoostedAPR > ${poolTAG} > account[${userAddress}] boosted APR: ${apr.multipliedBy(100).toNumber().toFixed(4)}%`);
    };
}

const main = async () => {
    const masterChef = new PlatypusChef(Config.network, Config.farmChef, './Avalanche/platypus/master.chef.json');
    await masterChef.getFarmingReceipts('0x881897b1FC551240bA6e2CAbC7E59034Af58428a');
    await masterChef.getPoolBaseAPR(1);
    await masterChef.getUserBoostedAPR(1, '0x881897b1FC551240bA6e2CAbC7E59034Af58428a');
};

main().catch((e) => {
    logger.error(e.message);
});

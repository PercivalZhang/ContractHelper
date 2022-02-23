import { ContractHelper } from '../../library/contract.helper';
import { LoggerFactory } from '../../library/LoggerFactory';
import { NetworkType } from '../../library/web3.factory';
import { SwissKnife } from '../../library/swiss.knife';
import { MasterChefHelper } from '../../library/master.chef';
import { SyrupChefHelper } from '../../library/syrup.chef';
import BigNumber from 'bignumber.js';

const Config = {
    //LP挖矿
    farmChef: {
        address: '0xb0523f9f473812fb195ee49bc7d2ab9873a98044',
        methods: {
            poolLength: 'poolLength',
            userInfo: 'userInfo',
            poolInfo: 'poolInfo',
            pendingReward: 'pendingTokens',
            rewardToken: 'ptp',
            totalAllocPoint: 'totalAllocPoint',
        },
        pool: {
            lpToken: 'lpToken',
            allocPoint: 'allocPoint',
        },
    },
    ptp: '0x22d4002028f537599be9f666d1c4fa138522f9c8',
    ptpPrice: 4.18,
    poolManager: '0x66357dcace80431aee0a7507e2e361b7e2402370',
    priceOracle: '0x7b52f4b5c476e7afd09266c35274737cd0af746b',
    tokens: {
        '0xc7198437980c041c805a1edcba50c1ce5db95118': 0.3, // USDT.e : BasePool奖励比例
        '0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664': 0.3, // USDC.e
        '0xd586e7f844cea2f87f50152665bcbc2c279d8d70': 0.25, // DAI.e
        '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e': 0.15,
    },
    ptpMonthlyEmissionAmount: 3000000, // BasePool(目前4个稳定币池子)分配30%；BoostedPool(PTP质押加成)分配50%
};

const network = NetworkType.AVALANCHE;

const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('pool');

const poolManager = new ContractHelper(Config.poolManager, './Avalanche/platypus/pool.manager.json', network);

const getPoolDetails = async (tokenAddress: string, ratio: number) => {
    const ptpToken = await swissKnife.syncUpTokenDB(Config.ptp);
    const underlyingToken = await swissKnife.syncUpTokenDB(tokenAddress);
    const priceOracleAddress = await poolManager.callReadMethod('getPriceOracle');
    logger.info(`price oracle address: ${priceOracleAddress}`);
    const priceOracle = new ContractHelper(priceOracleAddress, './Avalanche/platypus/price.oracle.json', network);

    const assetAddress = await poolManager.callReadMethod('assetOf', tokenAddress);
    const asset = new ContractHelper(assetAddress, './Avalanche/platypus/lp.token.json', network);
    const assetToken = await swissKnife.syncUpTokenDB(assetAddress);

    const poolTAG = `pool - ${underlyingToken.symbol}`;
    const assetPrice = await priceOracle.callReadMethod('getAssetPrice', tokenAddress);
    logger.info(
        `${poolTAG} > asset ${assetToken.symbol} price: ${new BigNumber(assetPrice)
            .dividedBy(1e8)
            .toNumber()
            .toFixed(4)} USD`,
    );

    const cash = await asset.callReadMethod('cash');
    logger.info(`${poolTAG} > cash: ${cash}`);

    const liability = await asset.callReadMethod('liability'); // pool total deposit
    logger.info(`${poolTAG} > liability: ${liability}`);
    logger.info(
        `${poolTAG} > total deposit: ${underlyingToken.readableAmount(liability).toFixed(4)} ${underlyingToken.symbol}`,
    );
    const totalDepositUSD = new BigNumber(liability)
        .multipliedBy(assetPrice)
        .dividedBy(1e8)
        .dividedBy(Math.pow(10, assetToken.decimals));
    logger.info(`${poolTAG} > total deposit: ${totalDepositUSD.toFixed(6)} USD`);
    //计算coverage ratio = cash / liability
    const coverageRatio = new BigNumber(cash).dividedBy(liability);
    logger.info(`${poolTAG} > coverage ratio: ${coverageRatio.multipliedBy(100).toNumber().toFixed(4)}%`);
    // //每月当前池子收到的PTP奖励（USD计价）
    // const poolMonthlyRewardedPTPUSD = new BigNumber(Config.ptpMonthlyEmissionAmount)
    //     .multipliedBy(0.3)
    //     .multipliedBy(ratio)
    //     .multipliedBy(Config.ptpPrice);
    // const baseAPY = poolMonthlyRewardedPTPUSD.multipliedBy(12).dividedBy(totalDepositUSD);
    // logger.info(`${poolTAG} > base APY: ${baseAPY.multipliedBy(100).toNumber().toFixed(4)}%`);
};
/**
 * 计算池子每年奖励PTP Token的数量
 * - base奖励
 * - boosted奖励：质押PTP，获取vePTP加成的奖励
 * @param pid
 * @param isBoosted true: Boosted奖励 | false: Base奖励
 * @returns
 */
const getPoolAnnualPtpReward = async (pid: number, isBoosted: boolean): Promise<number> => {
    const ptpToken = await swissKnife.syncUpTokenDB(Config.ptp);
    const masterChef = new ContractHelper(Config.farmChef.address, './Avalanche/platypus/master.chef.json', network);
    const ptpPerSecond = await masterChef.callReadMethod('ptpPerSec');
    const poolInfo = await masterChef.callReadMethod('poolInfo', pid);
    const poolAllocPoint = poolInfo['allocPoint'];
    const totalAllocPoint = await masterChef.callReadMethod('totalAllocPoint');
    const dialutingRepartition = await masterChef.callReadMethod('dialutingRepartition');
    const nonDialutingRepartition = await masterChef.callReadMethod('nonDialutingRepartition');

    const allPoolsAnnualPtpReward = new BigNumber(ptpPerSecond).multipliedBy(3600).multipliedBy(24).multipliedBy(365);
    const poolAnnualPtpReward = allPoolsAnnualPtpReward.multipliedBy(poolAllocPoint).dividedBy(totalAllocPoint);

    let repartition = dialutingRepartition; //base奖励的占比份额
    if (isBoosted) {
        repartition = nonDialutingRepartition; //boosted奖励的占比份额
    }
    let totalAnnualPtp = poolAnnualPtpReward.multipliedBy(repartition).dividedBy(1000);
    return ptpToken.readableAmountFromBN(totalAnnualPtp);
};
/**
 * 计算质押池base APR
 * @param pid 池子编号
 */
const getPoolBaseAPY = async (pid: number) => {
    const priceOracle = new ContractHelper(Config.priceOracle, './Avalanche/platypus/price.oracle.json', network);
    const masterChef = new ContractHelper(Config.farmChef.address, './Avalanche/platypus/master.chef.json', network);

    const poolAnnualReward = await getPoolAnnualPtpReward(pid, false);

    const poolInfo = await masterChef.callReadMethod('poolInfo', pid);
    const assetTokenAddress = poolInfo['lpToken'];
    const assetToken = await swissKnife.syncUpTokenDB(assetTokenAddress);
    const assetTokenHelper = new ContractHelper(assetTokenAddress, './Avalanche/platypus/lp.token.json', network);
    const totalStakedAsset = await assetTokenHelper.callReadMethod('balanceOf', Config.farmChef.address);

    const underlyingTokenAddress = await assetTokenHelper.callReadMethod('underlyingToken');
    const underlyingToken = await swissKnife.syncUpTokenDB(underlyingTokenAddress);
    const priceAsset = await priceOracle.callReadMethod('getAssetPrice', underlyingTokenAddress);

    const poolTAG = `pool[${pid}] - ${underlyingToken.symbol}`;
    const poolStakedTVLUSD = new BigNumber(priceAsset)
        .multipliedBy(totalStakedAsset)
        .dividedBy(1e8)
        .dividedBy(Math.pow(10, assetToken.decimals));
    const poolAnnualRewardUSD = new BigNumber(poolAnnualReward).multipliedBy(Config.ptpPrice);

    const apr = poolAnnualRewardUSD.dividedBy(poolStakedTVLUSD);
    logger.info(`${poolTAG} > base APR: ${apr.multipliedBy(100).toNumber().toFixed(4)} %`);
};
//计算用户Boosted APR
const getUserBoostedAPR = async (pid: number, userAddress: string) => {
    //const poolManager = new ContractHelper(Config.poolManager, './Avalanche/platypus/pool.manager.json', network);
    const ptpToken = await swissKnife.syncUpTokenDB(Config.ptp);
    //预言机合约
    const priceOracle = new ContractHelper(Config.priceOracle, './Avalanche/platypus/price.oracle.json', network);
    //masterchef挖矿合约
    const masterChef = new ContractHelper(Config.farmChef.address, './Avalanche/platypus/master.chef.json', network);
    //获取质押池每年奖励PTP Token的数量
    //true：计算Boosted APR
    //false: 计算Base APR
    const poolAnnualReward = await getPoolAnnualPtpReward(pid, true);
    logger.info(`getUserBoostedAPR > pool[${pid}] > annual reward: ${poolAnnualReward} ${ptpToken.symbol}`);
    //计算质押池每年奖励PTP Token的USD价值
    const poolAnnualRewardUSD = new BigNumber(poolAnnualReward).multipliedBy(Config.ptpPrice);
    //获取用户质押信息
    const userInfo = await masterChef.callReadMethod('userInfo', pid, userAddress);
    //用户质押的asset token(LPT)数量
    const userAssetTokenBalance = userInfo['amount'];
    //用户boosted因子
    const userFactor = userInfo['factor'];
    //获取池子信息
    const poolInfo = await masterChef.callReadMethod('poolInfo', pid);
    const assetTokenAddress = poolInfo['lpToken'];
    const assetToken = await swissKnife.syncUpTokenDB(assetTokenAddress);
    const assetTokenHelper = new ContractHelper(assetTokenAddress, './Avalanche/platypus/lp.token.json', network);
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
    logger.info(`${poolTAG} > account[${userAddress}] TVL: ${userTVLUSD.toNumber().toFixed(6)} USD`);
    //计算用户Boosted APR
    const apr = userAnnualRewardUSD.dividedBy(userTVLUSD);
    logger.info(`${poolTAG} > account[${userAddress}] boosted APR: ${apr.multipliedBy(100).toNumber().toFixed(4)} %`);
};
const main = async () => {
    // const underlyingTokenAddresses = await poolManager.callReadMethod('getTokenAddresses');
    // for (const [tokenAddress, ratio] of Object.entries(Config.tokens)) {
    //     await getPoolDetails(tokenAddress, ratio);
    //     break;
    // }
    await getPoolBaseAPY(1);
    await getUserBoostedAPR(1, '0x881897b1FC551240bA6e2CAbC7E59034Af58428a');
};

main().catch((e) => {
    logger.error(e.message);
});

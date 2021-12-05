import { ContractHelper } from '../library/contract.helper';
import { LoggerFactory } from '../library/LoggerFactory';
import { NetworkType } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';
import BigNumber from 'bignumber.js';
import { MasterChefHelper } from '../library/master.chef';

const network = NetworkType.POLYGON;

// Polygon区块时间2秒
const BlockNumPerDay = Math.floor((3600 * 24) / 2);

const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('main');

const Config = {
    gauges: ['0x3b6b158a76fd8ccc297538f454ce7b4787778c7c'],
};

const getGaugeReceipt = async (gaugeAddress: string, userAddress: string) => {
    const gauge = new ContractHelper(gaugeAddress, './Curve/gauge.json', network);
    gauge.toggleHiddenExceptionOutput();

    const lptAddress = await gauge.callReadMethod('lp_token');
    const lpERC20Token = await swissKnife.syncUpTokenDB(lptAddress);
    const lpToken = new ContractHelper(lptAddress, './Curve/lp.token.json', network);
    logger.info(`lp token - ${lpERC20Token.symbol}: ${lpERC20Token.address}`);

    const poolAddress = await lpToken.callReadMethod('minter');
    const pool = new ContractHelper(poolAddress, './Curve/pool.json', network);
    const lptPrice = await pool.callReadMethod('get_virtual_price');

    const rewardToken0Address = await gauge.callReadMethod('reward_tokens', 0);
    const rewardToken0 = await swissKnife.syncUpTokenDB(rewardToken0Address);
    logger.info(`reward Token - ${rewardToken0.symbol}: ${rewardToken0.address}`);

    const rewardToken1Address = await gauge.callReadMethod('reward_tokens', 1);
    const rewardToken1 = await swissKnife.syncUpTokenDB(rewardToken1Address);
    logger.info(`reward Token - ${rewardToken1.symbol}: ${rewardToken1.address}`);

    const rewardClaimerAddress = await gauge.callReadMethod('reward_contract');
    const rewardClaimer = new ContractHelper(rewardClaimerAddress, './Curve/reward.claimer.json', network);

    const rewardData = await rewardClaimer.callReadMethod('reward_data', 1);
    console.log(rewardData);
    const rewardDistributor = new ContractHelper(rewardData[0], './Curve/reward.crv.json', network);
    const rewardCount = await rewardDistributor.callReadMethod('reward_count');

    const reward0Data = await rewardDistributor.callReadMethod('reward_data', rewardToken0.address);
    const reward0Rate = reward0Data[2];
    logger.info(`reward 0 - ${rewardToken0.symbol} rate: ${reward0Rate}`);
    const annualReward0 = new BigNumber(reward0Rate).multipliedBy(3600 * 24 * 365);
    const readableAnnualRewardToken0 = rewardToken0.readableAmountFromBN(annualReward0);
    logger.info(`annual reward0: ${readableAnnualRewardToken0.toFixed(4)} ${rewardToken0.symbol}`);

    const reward1Data = await rewardDistributor.callReadMethod('reward_data', rewardToken1.address);
    const reward1Rate = reward1Data[2];
    logger.info(`reward 1 - ${rewardToken1.symbol} rate: ${reward1Rate}`);
    const annualReward1 = new BigNumber(reward1Rate).multipliedBy(BlockNumPerDay).multipliedBy(365);
    const readableAnnualRewardToken1 = rewardToken1.readableAmountFromBN(annualReward1);
    logger.info(`annual reward 1: ${readableAnnualRewardToken1.toFixed(4)} ${rewardToken1.symbol}`);

    const totalStakedLPTBalance = await gauge.callReadMethod('totalSupply');
    const totalStakedLPTValue = new BigNumber(totalStakedLPTBalance)
        .multipliedBy(lptPrice)
        .dividedBy(Math.pow(10, 18))
        .dividedBy(Math.pow(10, 18));
    logger.info(`total staked lp token value: ${totalStakedLPTValue.toNumber().toFixed(6)} USDT`);

    //获取用户质押数量
    const myStakedLPTBalance = await gauge.callReadMethod('balanceOf', userAddress);

    const myStakedLPTValue = new BigNumber(myStakedLPTBalance)
        .multipliedBy(lptPrice)
        .dividedBy(Math.pow(10, 18))
        .dividedBy(Math.pow(10, 18));
    logger.info(`my staked lp token value: ${myStakedLPTValue.toNumber().toFixed(6)} USDT`);
};

const main = async () => {
    for (const gaugeAddress of Config.gauges) {
        await getGaugeReceipt(gaugeAddress, '0xD2050719eA37325BdB6c18a85F6c442221811FAC');
        console.log(`\n---------------------------------------------------------------------\n`);
    }
};

main().catch((e) => {
    logger.error(e.message);
});

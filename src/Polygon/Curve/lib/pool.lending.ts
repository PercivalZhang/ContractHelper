import { ContractHelper } from '../../../library/contract.helper';
import { LoggerFactory } from '../../../library/LoggerFactory';
import { NetworkType } from '../../../library/web3.factory';
import { SwissKnife } from '../../../library/swiss.knife';
import BigNumber from 'bignumber.js';
import { getGaugeInfo } from './gauge';
import { PoolV1Info, PoolV1Params, Coin } from './data.types';

const network = NetworkType.POLYGON;
const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('Pool.Lending');

export const getLendingPoolInfo = async (poolAddress: string, poolParams: PoolV1Params, ignoreGauge = false) => {
    let poolInfo: PoolV1Info = {
        poolAddress: '',
        poolName: '',
        totalUSD: '',
        lpToken: '',
        gauge: null,
        adminFee: '',
        fee: '',
        a: '',
        gamma: '',
        coins: [],
        rewards: [],
    };
    poolInfo.poolAddress = poolAddress;
    const pool = new ContractHelper(poolAddress, './Polygon/Curve/pool.lending.json', network);
    const lptAddress = await pool.callReadMethod('lp_token');
    poolInfo.lpToken = lptAddress;
    const lptERC20 = await swissKnife.syncUpTokenDB(lptAddress);
    poolInfo.poolName = lptERC20.symbol;
    logger.info(`pool - ${lptERC20.symbol} > lp token - ${lptERC20.symbol}: ${lptAddress}`);
    let totalUSD = new BigNumber(0);
    for (let i = 0; i < poolParams.coinSize; i++) {
        const coin: Coin = {
            token: undefined,
            ratio: '',
            amount: '',
            totalUSD: '',
            priceOracle: '',
            priceScale: '',
            price: '',
        };
        let coinUSDValue = new BigNumber(0);
        const coinAddress = await pool.callReadMethod('coins', i);
        const coinToken = await swissKnife.syncUpTokenDB(coinAddress);
        logger.info(`pool - ${lptERC20.symbol} > coin - ${coinToken.symbol}: ${coinToken.address}`);
        const coinBalance = await pool.callReadMethod('balances', i);

        const underlyingCoinAddress = await pool.callReadMethod('underlying_coins', i);
        const underlyingCoinToken = await swissKnife.syncUpTokenDB(underlyingCoinAddress);
        logger.info(
            `pool - ${lptERC20.symbol} > underlying coin - ${underlyingCoinToken.symbol}: ${underlyingCoinToken.address}`,
        );

        coin.token = coinToken;
        coin.amount = coinToken.readableAmount(coinBalance).toFixed(6);
        coin.totalUSD = coinUSDValue.toNumber().toFixed(6);
        poolInfo.coins.push(coin);
    }
    // pool的swap费率，精度1e10
    const fee = new BigNumber(await pool.callReadMethod('fee'));
    poolInfo.fee = fee.dividedBy(1e10).multipliedBy(100).toFixed(3) + '%';
    logger.info(`pool - ${lptERC20.symbol} > fee: ${fee.dividedBy(1e10).multipliedBy(100).toFixed(3)}%`);
    // pool的管理费率，从交易费中扣除的比例，精度1e10
    // 管理费支付给veCRV的持有者
    const adminFee = new BigNumber(await pool.callReadMethod('admin_fee'));
    poolInfo.adminFee = adminFee.dividedBy(1e10).multipliedBy(100).toFixed(3) + '%';
    logger.info(
        `pool - ${lptERC20.symbol} > admin fee: ${adminFee.dividedBy(1e10).multipliedBy(100).toFixed(3)}% of ${fee
            .dividedBy(1e8)
            .toFixed(3)}%`,
    );
    // a pool’s tolerance for imbalance between the assets within it
    // 1 / A, A越大，滑点承受能力越强
    const paramA = await pool.callReadMethod('A');
    logger.info(`pool - ${lptERC20.symbol} > param - A: ${paramA}`);
    poolInfo.a = paramA;
    if (!ignoreGauge) {
        // 获取gauge自身及额外奖励相关的信息
        const gaugeInfo = await getGaugeInfo(poolParams.gauge.address, poolParams.gauge.rewardManager);
        poolInfo.lpToken = gaugeInfo.lptAddress;
        if (gaugeInfo.rewards.length > 0) {
            poolInfo.rewards.push(...gaugeInfo.rewards);
        }
        poolInfo.gauge = {
            address: gaugeInfo.address,
            relativeWeight: gaugeInfo.relativeWeight,
        };
    }
    return poolInfo;
};

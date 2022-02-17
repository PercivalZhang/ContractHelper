import { ContractHelper } from '../../../library/contract.helper';
import { LoggerFactory } from '../../../library/LoggerFactory';
import { NetworkType } from '../../../library/web3.factory';
import { SwissKnife } from '../../../library/swiss.knife';
import BigNumber from 'bignumber.js';
import { getGaugeInfo } from './gauge';
import { PoolV1Info, PoolV1Params, Coin } from './data.types';
import { Config, PoolCategory } from '../config';
import { getLendingPoolInfo } from './pool.lending';

const network = NetworkType.POLYGON;
const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('Pool.V1');

export const getPoolV1Info = async (poolAddress: string, poolParams: PoolV1Params) => {
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
    const pool = new ContractHelper(poolAddress, './Polygon/Curve/pool.v1.json', network);
    const lptAddress = await pool.callReadMethod('token');
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
        logger.info(
            `pool - ${lptERC20.symbol} > coin - ${coinToken.symbol} balance: ${coinToken
                .readableAmount(coinBalance)
                .toFixed(6)}`,
        );
        if (poolParams.coinPriceMap.has(i)) {
            const priceOracle = new BigNumber(
                await pool.callReadMethod('price_oracle', poolParams.coinPriceMap.get(i)),
            );
            coinUSDValue = priceOracle
                .multipliedBy(coinBalance)
                .dividedBy(1e18)
                .dividedBy(Math.pow(10, coinToken.decimals));
            totalUSD = totalUSD.plus(coinUSDValue);
            const priceScale = new BigNumber(await pool.callReadMethod('price_scale', poolParams.coinPriceMap.get(i)));
            logger.info(
                `pool - ${lptERC20.symbol} > coin - ${coinToken.symbol} oracle price: ${priceOracle
                    .dividedBy(1e18)
                    .toFixed(6)} USD`,
            );
            logger.info(
                `pool - ${lptERC20.symbol} > coin - ${coinToken.symbol} scale price: ${priceScale
                    .dividedBy(1e18)
                    .toFixed(6)} USD`,
            );
            coin.priceOracle = priceOracle.dividedBy(1e18).toNumber().toFixed(4);
            coin.priceScale = priceScale.dividedBy(1e18).toNumber().toFixed(4);
            coin.token = coinToken;
            coin.amount = coinToken.readableAmount(coinBalance).toFixed(6);
            coin.totalUSD = coinUSDValue.toNumber().toFixed(6);
            poolInfo.coins.push(coin);

            totalUSD = totalUSD.plus(coinUSDValue);
        } else {
            if (poolParams.pType === PoolCategory.Meta) {
                // pool coin[0]: lp token from other base pool
                logger.info(`coin[${i}] - ${coinToken.symbol} is Curve LP Token`);
                const subLPToken = new ContractHelper(coinToken.address, './Polygon/Curve/lp.token.json', network);
                const subPoolAddress = await subLPToken.callReadMethod('minter');
                const totalSupplyOfSubLPT = await subLPToken.callReadMethod('totalSupply');
                const subRatio = new BigNumber(coinBalance).dividedBy(totalSupplyOfSubLPT);

                const subPoolParams: PoolV1Params = Config.pools[subPoolAddress.toLowerCase()];
                if (subPoolParams.pType == PoolCategory.Lending) {
                    const subPoolInfo = await getLendingPoolInfo(
                        subPoolAddress,
                        Config.pools[subPoolAddress.toLowerCase()],
                        true,
                    );
                    for (const coin of subPoolInfo.coins) {
                        const subCoin: Coin = {
                            token: coin.token,
                            amount: subRatio.multipliedBy(coin.amount).toNumber().toFixed(6),
                            totalUSD: '',
                            ratio: '',
                            price: '',
                            priceOracle: '',
                            priceScale: '',
                        };
                        poolInfo.coins.push(subCoin);
                    }
                }
            } else {
                // Stable Coin
            }
        }
    }
    for (const coin of poolInfo.coins) {
        coin.ratio = new BigNumber(coin.totalUSD).dividedBy(totalUSD).multipliedBy(100).toNumber().toFixed(4) + '%';
    }
    poolInfo.totalUSD = totalUSD.toNumber().toFixed(6);
    logger.info(`pool - ${lptERC20.symbol} > total USD: ${totalUSD.toFixed(6)} USD`);
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
    const paramGamma = await pool.callReadMethod('gamma');
    logger.info(`pool - ${lptERC20.symbol} > param - Gamma: ${paramGamma}`);
    poolInfo.gamma = paramGamma;

    // 获取gauge自身及额外奖励相关的信息
    const gaugeInfo = await getGaugeInfo(poolParams.gauge.address, poolParams.gauge.rewardManager);
    console.log(gaugeInfo);
    poolInfo.lpToken = gaugeInfo.lptAddress;
    if (gaugeInfo.rewards.length > 0) {
        poolInfo.rewards.push(...gaugeInfo.rewards);
    }
    poolInfo.gauge = {
        address: gaugeInfo.address,
        relativeWeight: gaugeInfo.relativeWeight,
    };
    return poolInfo;
};

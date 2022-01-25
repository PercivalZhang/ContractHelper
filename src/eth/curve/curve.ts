import { ContractHelper } from '../../library/contract.helper';
import { LoggerFactory } from '../../library/LoggerFactory';
import { NetworkType } from '../../library/web3.factory';
import { SwissKnife } from '../../library/swiss.knife';
import BigNumber from 'bignumber.js';
import * as fs from 'fs';
import path from 'path';
import { ERC20Token } from '../../library/erc20.token';

const network = NetworkType.ETH_MAIN;

const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('main');
type Gauge = {
    address: string;
    relativeWeight: string;
};
type Reward = {
    token: ERC20Token;
    rate: string;
    price: string;
};
type Coin = {
    token: ERC20Token;
    amount: string;
    totalUSD: string;
    ratio: string;
    price: string;
    priceOracle: string;
    priceScale: string;
};
type PoolV1Info = {
    poolAddress: string;
    poolName: string;
    totalUSD: string;
    lpToken: string;
    gauge: Gauge;
    adminFee: string;
    fee: string;
    a: string;
    gamma: string;
    coins: Coin[];
    rewards: Reward[];
};
type PoolV2Info = {
    poolAddress: string;
    poolName: string;
    totalUSD: string;
    lpToken: string;
    gauge: Gauge;
    adminFee: string;
    fee: string;
    a: string;
    futureA: string;
    coins: Coin[];
    rewards: Reward[];
};
type PoolV1Params = {
    version: number;
    coinSize: number;
    coinPriceMap: Map<number, number>;
    gauge: string;
};
type PoolV2Params = {
    version: number;
    coinSize: number;
    gauge: string;
};
const Config = {
    crv: '0xD533a949740bb3306d119CC777fa900bA034cd52',
    stableCoin: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    gaugeController: '0x2f50d538606fa9edd2b11e2446beb18c9d5846bb',
    curveDAO: '0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2', // locked(_user):获取用户质押CRV的数量和时间 supply：共质押CRV数量
    pools: {
        v1: {
            '0xD51a44d3FaE010294C616388b506AcdA1bfAAE46': {
                version: 1,
                coinSize: 3,
                coinPriceMap: new Map([
                    [1, 0],
                    [2, 1],
                ]),
                gauge: '0xDeFd8FdD20e0f34115C7018CCfb655796F6B2168',
            },
        },
        v2: {
            '0x5a6A4D54456819380173272A5E8E9B9904BdF41B': {
                version: 2,
                coinSize: 2,
                gauge: '0xd8b712d29381748dB89c36BCa0138d7c75866ddF',
            },
        },
    },
};
const syncupGauges = async () => {
    const gController = new ContractHelper(Config.gaugeController, './ETH/Curve/gauge.controller.json', network);
    const gaugeSize = await gController.callReadMethod('n_gauges');
    logger.info(`controller > detected total ${gaugeSize} gauges`);
    for (let i = 0; i < gaugeSize; i++) {
        const gaugeAddress = await gController.callReadMethod('gauges', i);
        const gauge = new ContractHelper(gaugeAddress, './ETH/Curve/gauge.json', network);
        const lptAddress = await gauge.callReadMethod('lp_token');
        logger.info(`controller > gauge[${gaugeAddress}] > lpt: ${lptAddress}`);
        fs.writeFileSync(path.resolve('data', 'curve.gauges.txt'), lptAddress + ' : ' + gaugeAddress + '\n', {
            flag: 'a+',
        });
    }
};
const getPoolV1Info = async (poolAddress: string, poolParams: PoolV1Params) => {
    if (poolParams.version !== 1) {
        logger.warn(`require v1 pool`);
        return;
    }
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
    const CRV = new ContractHelper(Config.crv, './ETH/Curve/token.crv.json', network);
    const crvInflationRate = await CRV.callReadMethod('rate');
    const crvERC20 = await swissKnife.syncUpTokenDB(Config.crv);
    const pool = new ContractHelper(poolAddress, './ETH/Curve/pool.v1.json', network);
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
            coin.amount = coinUSDValue.toNumber().toFixed(6);
            coin.priceOracle = priceOracle.dividedBy(1e18).toNumber().toFixed(4);
            coin.priceScale = priceScale.dividedBy(1e18).toNumber().toFixed(4);
        } else {
            logger.info(
                `pool - ${lptERC20.symbol} > coin - ${coinToken.symbol} balance: ${coinToken
                    .readableAmount(coinBalance)
                    .toFixed(6)}`,
            );
            coinUSDValue = new BigNumber(coinBalance).dividedBy(Math.pow(10, coinToken.decimals));
            totalUSD = totalUSD.plus(coinUSDValue);
            coin.priceOracle = '1';
            coin.priceScale = '1';
        }
        coin.token = coinToken;
        coin.amount = coinToken.readableAmount(coinBalance).toFixed(6);
        coin.totalUSD = coinUSDValue.toNumber().toFixed(6);
        poolInfo.coins.push(coin);
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

    poolInfo.rewards.push({ token: crvERC20, rate: crvInflationRate, price: '' });
    // 获取gauge自身及额外奖励相关的信息
    const gaugeInfo = await getGaugeInfo(poolParams.gauge);
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

const getPoolV2Info = async (poolAddress: string, poolParams: PoolV2Params) => {
    if (poolParams.version !== 2) {
        logger.warn(`require v2 pool`);
        return;
    }
    let poolInfo: PoolV2Info = {
        poolAddress: '',
        poolName: '',
        totalUSD: '',
        lpToken: '',
        gauge: null,
        adminFee: '',
        fee: '',
        a: '',
        futureA: '',
        coins: [],
        rewards: [],
    };
    poolInfo.poolAddress = poolAddress;
    const CRV = new ContractHelper(Config.crv, './ETH/Curve/token.crv.json', network);
    const crvInflationRate = await CRV.callReadMethod('rate');
    const crvERC20 = await swissKnife.syncUpTokenDB(Config.crv);
    const pool = new ContractHelper(poolAddress, './ETH/Curve/pool.v2.json', network);
    poolInfo.poolName = await pool.callReadMethod('symbol');
    for (let i = 0; i < poolParams.coinSize; i++) {
        const coin: Coin = {
            token: undefined,
            ratio: '',
            amount: '0',
            totalUSD: '0',
            priceOracle: '0',
            priceScale: '0',
            price: '0',
        };
        const coinAddress = await pool.callReadMethod('coins', i);
        const coinToken = await swissKnife.syncUpTokenDB(coinAddress);
        logger.info(`pool - ${poolInfo.poolName} > coin - ${coinToken.symbol}: ${coinToken.address}`);
        const coinBalance = await pool.callReadMethod('balances', i);
        coin.token = coinToken;
        coin.amount = coinToken.readableAmount(coinBalance).toFixed(6);
        poolInfo.coins.push(coin);
    }
    // pool的swap费率，精度1e10
    const fee = new BigNumber(await pool.callReadMethod('fee'));
    poolInfo.fee = fee.dividedBy(1e10).multipliedBy(100).toFixed(3) + '%';
    logger.info(`pool - ${poolInfo.poolName} > fee: ${fee.dividedBy(1e10).multipliedBy(100).toFixed(3)}%`);
    // pool的管理费率，从交易费中扣除的比例，精度1e10
    // 管理费支付给veCRV的持有者
    const adminFee = new BigNumber(await pool.callReadMethod('admin_fee'));
    poolInfo.adminFee = adminFee.dividedBy(1e10).multipliedBy(100).toFixed(3) + '%';
    logger.info(
        `pool - ${poolInfo.poolName} > admin fee: ${adminFee.dividedBy(1e10).multipliedBy(100).toFixed(3)}% of ${fee
            .dividedBy(1e8)
            .toFixed(3)}%`,
    );
    // a pool’s tolerance for imbalance between the assets within it
    // 1 / A, A越大，滑点承受能力越强
    const paramA = await pool.callReadMethod('A');
    logger.info(`pool - ${poolInfo.poolName} > param - A: ${paramA}`);
    poolInfo.a = paramA;
    // pool的future_A, 精度100
    const futureA = new BigNumber(await pool.callReadMethod('future_A'));
    poolInfo.futureA = futureA.dividedBy(100).toString();
    logger.info(`pool - ${poolInfo.poolName} > future_A: ${poolInfo.futureA}`);
    // 添加默认奖励CRV Token
    poolInfo.rewards.push({ token: crvERC20, rate: crvInflationRate, price: '' });
    // 获取gauge自身及额外奖励相关的信息
    const gaugeInfo = await getGaugeInfo(poolParams.gauge);
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

type GaugeInfo = {
    address: string;
    relativeWeight: string;
    lptAddress: string;
    rewards: Reward[];
};
const getGaugeInfo = async (gaugeAddress: string): Promise<GaugeInfo> => {
    const gaugeInfo: GaugeInfo = {
        address: '',
        relativeWeight: '',
        lptAddress: '',
        rewards: [],
    };
    gaugeInfo.address = gaugeAddress;
    const rewards: Reward[] = [];
    const gauge = new ContractHelper(gaugeAddress, './ETH/Curve/gauge.json', network);
    const lptAddress = await gauge.callReadMethod('lp_token');
    gaugeInfo.lptAddress = lptAddress;
    try {
        const rewardCount = Number.parseInt(await gauge.callReadMethod('reward_count'));
        logger.info(`getGaugeInfo > detected ${rewardCount} reward tokens`);
        for (let i = 0; i < rewardCount; i++) {
            const rewardTokenAddress = await gauge.callReadMethod('reward_tokens', i);
            const rewardToken = await swissKnife.syncUpTokenDB(rewardTokenAddress);
            const reward_data = await gauge.callReadMethod('reward_data', rewardTokenAddress);
            const reward_rate = reward_data['rate'];
            rewards.push({ token: rewardToken, rate: reward_rate, price: '' });
        }
        gaugeInfo.rewards = rewards;
    } catch (e) {
        logger.warn(`no extra reward tokens`);
    }
    const gController = new ContractHelper(Config.gaugeController, './ETH/Curve/gauge.controller.json', network);
    const relativeWeight = await gController.callReadMethod('gauge_relative_weight', gaugeAddress);
    gaugeInfo.relativeWeight = relativeWeight;
    return gaugeInfo;
};

const main = async () => {
    // for (const [poolAddress, poolParams] of Object.entries(Config.pools.v1)) {
    //     const poolInfo = await getPoolV1Info(poolAddress, poolParams);
    //     console.log(JSON.stringify(poolInfo));
    // }
    for (const [poolAddress, poolParams] of Object.entries(Config.pools.v2)) {
        const poolInfo = await getPoolV2Info(poolAddress, poolParams);
        console.log(JSON.stringify(poolInfo));
    }
    //await syncupGauges();
};

main().catch((e) => {
    logger.error(e.message);
});

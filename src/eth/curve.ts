import { ContractHelper } from '../library/contract.helper';
import { LoggerFactory } from '../library/LoggerFactory';
import { NetworkType } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';
import { MasterChefHelper } from '../library/master.chef';
import { SyrupChefHelper } from '../library/syrup.chef';
import BigNumber from 'bignumber.js';
import * as fs from 'fs';
import path from 'path';

const network = NetworkType.ETH_MAIN;

const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('main');

export interface PoolParams {
    coinSize: number;
    coinPriceMap: Map<number, number>;
}

const Config = {
    stableCoin: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    gaugeController: '0x2f50d538606fa9edd2b11e2446beb18c9d5846bb',
    pools: {
        plain: {
            '0xD51a44d3FaE010294C616388b506AcdA1bfAAE46': {
                coinSize: 3,
                coinPriceMap: new Map([
                    [1, 0],
                    [2, 1],
                ]),
            },
        },
    },
};
const syncupGauges = async () => {
    const gController = new ContractHelper(Config.gaugeController, './ETH/Curve/gauge.controller.json', network);
    const gaugeSize = await gController.callReadMethod('n_gauges');
    logger.info(`controller > detected total ${gaugeSize} gauges`);
    for(let i = 0; i < gaugeSize; i++) {
        const gaugeAddress = await gController.callReadMethod('gauges', i);
        const gauge = new ContractHelper(gaugeAddress, './ETH/Curve/gauge.json', network);
        const lptAddress = await gauge.callReadMethod('lp_token');
        logger.info(`controller > gauge[${gaugeAddress}] > lpt: ${lptAddress}`);
        fs.writeFileSync(path.resolve('data', 'curve.gauges.txt'), lptAddress + ' : ' + gaugeAddress + '\n', { flag: 'a+' });
    }

};
const getPlainPoolInfo = async (poolAddress: string, poolParams: PoolParams) => {
    const usd = await swissKnife.syncUpTokenDB(Config.stableCoin);
    const pool = new ContractHelper(poolAddress, './ETH/Curve/pool.json', network);
    const lptAddress = await pool.callReadMethod('token');
    const lptERC20 = await swissKnife.syncUpTokenDB(lptAddress);
    logger.info(`pool - ${lptERC20.symbol} > lp token - ${lptERC20.symbol}: ${lptAddress}`);
    let totalUSD = new BigNumber(0);
    for (let i = 0; i < poolParams.coinSize; i++) {
        const coinAddress = await pool.callReadMethod('coins', i);
        const coin = await swissKnife.syncUpTokenDB(coinAddress);
        logger.info(`pool - ${lptERC20.symbol} > coin - ${coin.symbol}: ${coin.address}`);
        if (poolParams.coinPriceMap.has(i)) {
            const coinBalance = await pool.callReadMethod('balances', i);
            const priceOracle = new BigNumber(
                await pool.callReadMethod('price_oracle', poolParams.coinPriceMap.get(i)),
            );
            const coinUSDValue = priceOracle
                .multipliedBy(coinBalance)
                .dividedBy(1e18)
                .dividedBy(Math.pow(10, coin.decimals));
            totalUSD = totalUSD.plus(coinUSDValue);
            const priceScale = new BigNumber(await pool.callReadMethod('price_scale', poolParams.coinPriceMap.get(i)));
            logger.info(
                `pool - ${lptERC20.symbol} > coin - ${coin.symbol} oracle price: ${priceOracle
                    .dividedBy(1e18)
                    .toFixed(6)} USD`,
            );
            logger.info(
                `pool - ${lptERC20.symbol} > coin - ${coin.symbol} scale price: ${priceScale
                    .dividedBy(1e18)
                    .toFixed(6)} USD`,
            );
        } else {
            const coinBalance = await pool.callReadMethod('balances', i);
            logger.info(
                `pool - ${lptERC20.symbol} > coin - ${coin.symbol} balance: ${coin
                    .readableAmount(coinBalance)
                    .toFixed(6)}`,
            );
            const coinUSDValue = new BigNumber(coinBalance).dividedBy(Math.pow(10, coin.decimals));
            totalUSD = totalUSD.plus(coinUSDValue);
        }
    }
    logger.info(`pool - ${lptERC20.symbol} > total USD: ${totalUSD.toFixed(6)} USD`);
    // pool的swap费率，精度1e10
    const fee = new BigNumber(await pool.callReadMethod('fee'));
    logger.info(`pool - ${lptERC20.symbol} > fee: ${fee.dividedBy(1e10).multipliedBy(100).toFixed(3)}%`);
    // pool的管理费率，从交易费中扣除的比例，精度1e10
    // 管理费支付给veCRV的持有者
    const adminFee = new BigNumber(await pool.callReadMethod('admin_fee'));
    logger.info(
        `pool - ${lptERC20.symbol} > admin fee: ${adminFee
            .dividedBy(1e10)
            .multipliedBy(100)
            .toFixed(3)}% of ${fee.dividedBy(1e8).toFixed(3)}%`,
    );
    // a pool’s tolerance for imbalance between the assets within it
    // 1 / A, A越大，滑点承受能力越强
    const paramA = await pool.callReadMethod('A');
    logger.info(`pool - ${lptERC20.symbol} > param - A: ${paramA}`);
    const paramGamma = await pool.callReadMethod('gamma');
    logger.info(`pool - ${lptERC20.symbol} > param - Gamma: ${paramGamma}`);
};

const main = async () => {
    // for (const [poolAddress, poolParams] of Object.entries(Config.pools.plain)) {
    //     await getPlainPoolInfo(poolAddress, poolParams);
    // }
    await syncupGauges();
};

main().catch((e) => {
    logger.error(e.message);
});

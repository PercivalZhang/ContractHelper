// search all NFT whose owner = booster
// get each NFT tokens
// add them all = TVL

//rewardPerBlock * (NFT_vLiquidity / total_vLiquidity)

import { BigintIsh, MaxUint256, Percent, Price, CurrencyAmount, Token } from '@uniswap/sdk-core';
import { LoggerFactory } from '../../library/LoggerFactory';
import { ContractHelper } from '../../library/contract.helper';
import { SwissKnife } from '../../library/swiss.knife';
import { Config } from './config';
import { Slot0Data, UniV3PM } from '../../library/uni.v3/uni.v3.pm';
import { Position as UniV3POS } from '@uniswap/v3-sdk';
import { UniV3Util } from '../../library/uni.v3/uni.v3.util';
import { UniV3JSONDB } from '../../library/uni.v3/uni.v3.db';
import JSBI from 'jsbi';

const logger = LoggerFactory.getInstance().getLogger('UniV3');
const gSwissKnife = new SwissKnife(Config.network);
const gUniV3PM = UniV3PM.getInstance(Config.uniV3.factory, Config.uniV3.positionMannager, Config.network);
const gUniV3DB = UniV3JSONDB.getInstance()
const gUniV3Util = UniV3Util.getInstance(Config.network)

const main = async () => {
    /**
     * 调用Univ3 SDK构造V3池子对象
     * UniV3Util - UniV3 SDK封装类
     */
    const poolAddress = UniV3Util.computePoolAddress(Config.uniV3.factory, '0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39', '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 3000)
    //await gUniV3Util.getPoolImmutables(poolAddress)
    //await gUniV3Util.getPoolState(poolAddress)
    
    const pid = 267846
    const pos = await gUniV3PM.getPositionById(pid)
    if(pos) {
        const uniV3Pool = await gUniV3Util.getPoolInstance(pos.pool)

        //调用Univ3 SDK构造V3头寸对象
        const univ3POS = new UniV3POS({
            pool: uniV3Pool,
            liquidity: pos.liquidity,
            tickLower: pos.tickLower,
            tickUpper: pos.tickUpper,
        });
        //获取两种token的数量
        const amount0 = univ3POS.amount0.quotient.toString();
        const amount1 = univ3POS.amount1.quotient.toString();
        console.log(amount0)
        console.log(amount1)
        console.log(uniV3Pool.token0Price.toFixed(4))
    } else {
        logger.warn(`pos - ${pid} does not exist / its liquidity is zero`)
    }
    // console.log(uniV3Pool.token1Price.toFixed(4))
};

main().catch((e) => {
    logger.error(e.message);
});

import { ContractHelper } from '../../library/contract.helper';
import { LoggerFactory } from '../../library/LoggerFactory';
import { NetworkType } from '../../library/web3.factory';
import { SwissKnife } from '../../library/swiss.knife';
import BigNumber from 'bignumber.js';
import * as fs from 'fs';
import path from 'path';
import { ERC20Token } from '../../library/erc20.token';
import { type } from 'os';
import { stringify } from 'querystring';

type PoolMetadata = {
    poolAddress: string;
    lpTokenAddress: string;
    coinSize: number,
    coinPriceMap: Map<number, number>;
}
const Config = {
    pools: {
        v1: [
                {//tricrypto2:BTC/ETH/USDC
                    poolAddress: '0xd51a44d3fae010294c616388b506acda1bfaae46',
                    lpTokenAddress:'0xc4ad29ba4b3c580e6d59105fff484999997675ff',
                    coinSize: 3,
                    coinPriceMap: new Map([
                        [1, 0],
                        [2, 1],
                    ]),
                }
        ]
    }
}
const network = NetworkType.ETH_MAIN;

const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('pool.v1.dog');

const blockHeight = 14274700;
// 每8小时访问一次
const BlockNum8Hours = Math.floor((3600 * 8) / 15);
//取过去一年内的数据
const BlockNumPerYear = Math.floor((3600 * 24 * 356) / 15);
const lowerBlockNum = blockHeight - BlockNumPerYear;

const getLPTAmountAndBalances = async(poolData: PoolMetadata, startBlockNum: number, endBlockNum: number) => {
    logger.info(`block number range: ${startBlockNum} ~ ${endBlockNum}`);
    const poolHelper = new ContractHelper(poolData.poolAddress, './ETH/Curve/pool.v1.json', network);
    const lptHelper = new ContractHelper(poolData.lpTokenAddress, './ETH/Curve/lp.token.json', network);
    //for(let blockNum = startBlockNum; blockNum <= endBlockNum; blockNum++) {
    let currentBlockNum = startBlockNum;    
    while(currentBlockNum <= endBlockNum) {  
        const record = {
            LP: '',
            btc: '',
            eth: '',
            usdt: '',
            priceOrcaleBTC:'',
            priceOrcaleETH:'',
            priceScaleBTC:'',
            priceScaleETH:'',
            blockNum: ''
        }
        //有效区间才触发访问Archive Data
        if(startBlockNum < endBlockNum) {
            poolHelper.setDefaultBlock(currentBlockNum);
            lptHelper.setDefaultBlock(currentBlockNum);
            record.blockNum = currentBlockNum.toString();
        } else { //无效区间，直接获取当前状态
            record.blockNum = String(await poolHelper.getBlockHeight());
        }
        for(let i = 0; i < poolData.coinSize; i++) {
            const coinAddress = await poolHelper.callReadMethod('coins', i);
            const coin = await swissKnife.syncUpTokenDB(coinAddress);
            const balance = new BigNumber(await poolHelper.callReadMethod('balances', i));
            if (poolData.coinPriceMap.has(i)) {
                const priceOracle = new BigNumber(
                    await poolHelper.callReadMethod('price_oracle', poolData.coinPriceMap.get(i)),
                ).dividedBy(1e18);
                const priceScale = new BigNumber(
                    await poolHelper.callReadMethod('price_scale', poolData.coinPriceMap.get(i)),
                ).dividedBy(1e18);
                if(i == 1) { // BTC
                    record.btc = balance.dividedBy(Math.pow(10, coin.decimals)).toNumber().toFixed(4);
                    record.priceOrcaleBTC = priceOracle.toNumber().toFixed(4);
                    record.priceScaleBTC = priceScale.toNumber().toFixed(4);
                } else {
                    record.eth = balance.dividedBy(Math.pow(10, coin.decimals)).toNumber().toFixed(4);
                    record.priceOrcaleETH = priceOracle.toNumber().toFixed(4);
                    record.priceScaleETH = priceScale.toNumber().toFixed(4);
                }
            } else { // usdt
                record.usdt = balance.dividedBy(Math.pow(10, coin.decimals)).toNumber().toFixed(4);
            }
        }
        const totalSupplyOfLPT = new BigNumber(await lptHelper.callReadMethod('totalSupply'));
        record.LP = totalSupplyOfLPT.dividedBy(1e18).toNumber().toFixed(4);
        console.log(record);
        currentBlockNum = currentBlockNum + BlockNum8Hours;
    }
}

const main = async () => {
    await getLPTAmountAndBalances(Config.pools.v1[0], blockHeight, blockHeight);
};

main().catch((e) => {
    logger.error(e.message);
});
//https://www.npmjs.com/package/csv-writer 写入csv文件




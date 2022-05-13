// search all NFT whose owner = booster
// get each NFT tokens
// add them all = TVL

//rewardPerBlock * (NFT_vLiquidity / total_vLiquidity)

import { BigintIsh, MaxUint256, Percent, Price, CurrencyAmount, Token } from '@uniswap/sdk-core';
import { LoggerFactory } from '../../library/LoggerFactory';
import BigNumber from 'bignumber.js';
import { ContractHelper } from '../../library/contract.helper';
import { SwissKnife } from '../../library/swiss.knife';
import { Config } from './Config';
import { Slot0Data, UniV3PM } from '../../library/uni.v3/uni.v3';
import { Position as UniV3POS } from '@uniswap/v3-sdk';
import { UniV3Util } from '../../library/uni.v3/uni.v3.util';
import JSBI from 'jsbi';

const logger = LoggerFactory.getInstance().getLogger('FarmingPool');
const gSwissKnife = new SwissKnife(Config.network);
const gUniV3PM = UniV3PM.getInstance(Config.uniV3.factory, Config.uniV3.positionMannager, Config.network);

export class FarmingPool {
    public readonly address: string;
    private itself: ContractHelper;
    private hideExceptionOutput: boolean;

    constructor(poolAddress: string) {
        this.itself = new ContractHelper(poolAddress, './Arbitrum/izumi/booster.json', Config.network);
        this.address = poolAddress;
        this.hideExceptionOutput = false;
    }

    public toggleHiddenExceptionOutput() {
        this.hideExceptionOutput = !this.hideExceptionOutput;
    }

    public async getPoolInfo() {
        //获取质押到izumi池子里的所有univ3 NFT的头寸信息
        const positions = await gUniV3PM.getUserNFTPositions(this.address); // this.address izumi质押池合约地址
        logger.info(`getPoolInfo > total staked ${positions.length} user NFT LP`);

        if (positions && positions.length > 0) {
            const token0 = positions[0].token0.token;
            const token1 = positions[0].token1.token;
            //加载univ3 pool合约
            const pool = new ContractHelper(positions[0].pool, './Uniswap/v3/pool.json', Config.network);
            //获取池子slot0数据
            const slot0Info = await pool.callReadMethod('slot0');
            const slot0Data: Slot0Data = {
                sqrtPriceX96: slot0Info[0],
                tick: slot0Info[1],
            };
            let amountOfToken0 = 0.0;
            let amount1fToken1 = 0.0;
            //遍历每个NFT头寸，分别计算每个头寸对应的两个token的数量，将其分别累加，最后得到的两个累加和，就是质押池TVL中的两种token的数量
            for (let i = 0; i < positions.length; i++) {
                const newPOS = await gUniV3PM.calPositionTokenAmount(positions[i], slot0Data);
                amountOfToken0 += Number.parseFloat(newPOS.token0.amount);
                amount1fToken1 += Number.parseFloat(newPOS.token1.amount);
            }

            logger.info(`getPoolInfo > token0 - ${token0.symbol}: ${amountOfToken0}`);
            logger.info(`getPoolInfo > token1 - ${token1.symbol}: ${amount1fToken1}`);
        }
    }

    public async getUserInfo(userAddress: string) {
        //获取用户质押的univ3 NFT头寸列表
        const ids = await this.itself.callReadMethod('getTokenIds', userAddress); // this.itself izumi质押池合约
        logger.info(`getUserInfo > detected ${ids.length} staked NFT`);
        for (let id of ids) {
            //通过position id(UniV3 LP NFT token id)访问UniV3 Position Manager合约获取position的基本信息
            const nftPOS = await gUniV3PM.getPositionById(id);
            /**
             * 调用Univ3 SDK构造V3池子对象
             * UniV3Util - UniV3 SDK封装类
             */
            const uniV3Pool = await UniV3Util.getInstance(Config.network).getPoolInstance(nftPOS.pool);
            console.log(uniV3Pool.tickCurrent);
            //调用Univ3 SDK构造V3头寸对象
            const univ3POS = new UniV3POS({
                pool: uniV3Pool,
                liquidity: nftPOS.liquidity,
                tickLower: nftPOS.tickLower,
                tickUpper: nftPOS.tickUpper,
            });
            //获取两种token的数量
            const amount0 = univ3POS.amount0.quotient.toString();
            const amount1 = univ3POS.amount1.quotient.toString();
            nftPOS.token0.amount = amount0;
            nftPOS.token1.amount = amount1;
            logger.info(`pos[${id}] > token0 - ${nftPOS.token0.token.symbol} amount: ${amount0}`);
            logger.info(`pos[${id}] > token0 - ${nftPOS.token1.token.symbol} amount: ${amount1}`);
            //获取token0的下限和上限价格
            const priceLower = univ3POS.token0PriceLower.toFixed(6);
            const priceUpper = univ3POS.token0PriceUpper.toFixed(6);
            nftPOS.priceLower = Number.parseFloat(priceLower);
            nftPOS.priceUpper = Number.parseFloat(priceUpper);
            logger.info(`pos[${id}] > price lower: ${priceLower} ${uniV3Pool.token1.symbol}`);
            logger.info(`pos[${id}] > price upper: ${priceUpper} ${uniV3Pool.token1.symbol}`);
            console.log(nftPOS);

            const status = await this.itself.callReadMethod('tokenStatus', id);
            const vLQ = status['vLiquidity'];
            const validVLQ = status['validVLiquidity'];
            /**
             * 合约方法_computeValidVLiquidity
             * //uint256 iziVLiquidity = (vLiquidity * 4 + (totalVLiquidity * nIZI * 6) / totalNIZI) / 10;
             * //return Math.min(iziVLiquidity, vLiquidity);
             * 当没有存入平台币的情况下，最小valid vLQ = 0.4 * vLQ
             * 当存入平台币的情况下，最大valid vLQ = vLQ
             * 因此boost挖矿的倍数因子 = valid vLQ / (vLQ * 0.4), 范围1 ～ 2.5
             */
            const boostFactor = new BigNumber(validVLQ).dividedBy(vLQ).dividedBy(0.4);
            logger.info(`pos[${id}] boost factor:  ${boostFactor.toNumber().toFixed(4)}`);
            //获取每个UniV3 LP NFT质押的待领取奖励信息
            const pendingRewardData = await this.itself.callReadMethod('pendingReward', id);
            const rewardInfosLen = await this.itself.callReadMethod('rewardInfosLen');
            for (let i = 0; i < Number.parseInt(rewardInfosLen); i++) {
                const rewardTokenData = await this.itself.callReadMethod('rewardInfos', i);
                const rewardToken = await gSwissKnife.syncUpTokenDB(rewardTokenData[0]);
                logger.info(
                    `pos[${id}] > pending reward - ${rewardToken.symbol} > ${rewardToken
                        .readableAmount(pendingRewardData[i])
                        .toFixed(6)}`,
                );
            }
        }
        if (ids.length > 0) {
            //获取用户质押挖矿的待领取奖励
            const pendingRewardData = await this.itself.callReadMethod('pendingRewards', userAddress);
            const rewardInfosLen = await this.itself.callReadMethod('rewardInfosLen');
            for (let i = 0; i < Number.parseInt(rewardInfosLen); i++) {
                const rewardTokenData = await this.itself.callReadMethod('rewardInfos', i);
                const rewardToken = await gSwissKnife.syncUpTokenDB(rewardTokenData[0]);
                logger.info(
                    `total pending reward - ${rewardToken.symbol} > ${rewardToken
                        .readableAmount(pendingRewardData[i])
                        .toFixed(6)}`,
                );
            }
        }
    }
}

const main = async () => {
    const pool = new FarmingPool('0xb2decea19d58ebe10ab215a04db2edbe52e37fa4');
    await pool.getPoolInfo();
    //await pool.getUserInfo('0x881897b1FC551240bA6e2CAbC7E59034Af58428a');

    // const pool = await UniV3Util.getInstance(Config.network).getPoolInstance(
    //     '0x13398E27a21Be1218b6900cbEDF677571df42A48',
    // );
    // console.log(pool.fee);
};

main().catch((e) => {
    logger.error(e.message);
});

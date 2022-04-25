// search all NFT whose owner = booster
// get each NFT tokens
// add them all = TVL

//rewardPerBlock * (NFT_vLiquidity / total_vLiquidity)

import { LoggerFactory } from '../../library/LoggerFactory';
import BigNumber from 'bignumber.js';
import { ContractHelper } from '../../library/contract.helper';
import { SwissKnife } from '../../library/swiss.knife';
import { Config } from './Config';
import { ERC20Token } from '../../library/erc20.token';
import { Slot0Data, UniV3Helper } from '../../library/uni.v3/uni.v3';
import { lchmodSync } from 'fs';

const logger = LoggerFactory.getInstance().getLogger('FarmingPool');
const gSwissKnife = new SwissKnife(Config.network);
const gUniV3Helper = UniV3Helper.getInstance(Config.uniV3.factory, Config.uniV3.positionMannager, Config.network);

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
        const positions = await gUniV3Helper.getUserNFTPositions(this.address);
        logger.info(`getPoolInfo > total staked ${positions.length} user NFT LP`);

        if (positions && positions.length > 0) {
            const token0 = positions[0].token0.token;
            const token1 = positions[0].token1.token;
            const pool = new ContractHelper(positions[0].pool, './Uniswap/v3/pool.json', Config.network);
            const slot0Info = await pool.callReadMethod('slot0');
            const slot0Data: Slot0Data = {
                sqrtPriceX96: slot0Info[0],
                tick: slot0Info[1],
            };
            let amountOfToken0 = 0.0;
            let amount1fToken1 = 0.0;

            for (let i = 0; i < positions.length; i++) {
                const newPOS = await gUniV3Helper.calPositionTokenAmount(positions[i], slot0Data);
                amountOfToken0 += Number.parseFloat(newPOS.token0.amount);
                amount1fToken1 += Number.parseFloat(newPOS.token1.amount);
            }

            logger.info(`getPoolInfo > token0 - ${token0.symbol}: ${amountOfToken0}`);
            logger.info(`getPoolInfo > token1 - ${token1.symbol}: ${amount1fToken1}`);
        }
    }

    public async getUserInfo(userAddress: string) {
        const ids = await this.itself.callReadMethod('getTokenIds', userAddress);
        logger.info(`getUserInfo > detected ${ids.length} staked NFT`);
        for (let id of ids) {
            const pos = await gUniV3Helper.getPositionById(id, false);
            console.log(pos);
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
        }
        if (ids.length > 0) {
            const pendingRewardData = await this.itself.callReadMethod('pendingRewards', userAddress);
            const rewardInfosLen = await this.itself.callReadMethod('rewardInfosLen');
            for (let i = 0; i < Number.parseInt(rewardInfosLen); i++) {
                const rewardTokenData = await this.itself.callReadMethod('rewardInfos', i);
                const rewardToken = await gSwissKnife.syncUpTokenDB(rewardTokenData[0]);
                logger.info(
                    `pending reward - ${rewardToken.symbol} > ${rewardToken
                        .readableAmount(pendingRewardData[i])
                        .toFixed(6)}`,
                );
            }
        }
    }
}

const main = async () => {
    const pool = new FarmingPool('0xb2decea19d58ebe10ab215a04db2edbe52e37fa4');
    //await pool.getPoolInfo();
    await pool.getUserInfo('0x881897b1FC551240bA6e2CAbC7E59034Af58428a');
};

main().catch((e) => {
    logger.error(e.message);
});

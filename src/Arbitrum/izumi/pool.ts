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
import { UniV3Helper } from '../../library/uni.v3';

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
    }

    public async getUserInfo(userAddress: string) {
        const ids = await this.itself.callReadMethod('getTokenIds', userAddress);
        for (let id of ids) {
            const pos = await gUniV3Helper.getPositionById(id);
            console.log(pos);
        }
    }
}

const main = async () => {
    const pool = new FarmingPool('0xb2decea19d58ebe10ab215a04db2edbe52e37fa4');
    await pool.getUserInfo('0x881897b1FC551240bA6e2CAbC7E59034Af58428a');
};

main().catch((e) => {
    logger.error(e.message);
});

import { LoggerFactory } from '../../library/LoggerFactory';
import BigNumber from 'bignumber.js';
import { ContractHelper } from '../../library/contract.helper';
import { SwissKnife } from '../../library/swiss.knife';
import { Config } from './Config';
import { ERC20Token } from '../../library/erc20.token';

const logger = LoggerFactory.getInstance().getLogger('farming');
//const smeltSaving = SmeltSaving.getInstance(Config.smeltSavings);
const swissKnife = new SwissKnife(Config.network);

// export class Pool {
//     public readonly address: string;
//     private pool: ContractHelper;
//     private hideExceptionOutput: boolean;
 
//     private rewardToken: ERC20Token;
//     private lpt: ERC20Token;

//     constructor(address: string) {
//         this.pool = new ContractHelper(address, './ETH/Tokemak/pool.eth.json', Config.network);
//         this.address = address;
//         this.hideExceptionOutput = false;
//     }

//     public toggleHiddenExceptionOutput() {
//         this.hideExceptionOutput = !this.hideExceptionOutput;
//     }
 
//     public async getPoolInfo() {
//         const tToken = await swissKnife.syncUpTokenDB(this.address);
//         logger.info(`getPoolInfo > tToken - ${tToken.symbol}: ${this.address}`);
        
//         const underlyingTokenAddress = await this.pool.callReadMethod('underlyer');
//         const underlyingToken = await swissKnife.syncUpTokenDB(underlyingTokenAddress);
//         logger.info(`getPoolInfo > underlying token - ${underlyingToken.symbol}: ${underlyingToken.address}`);
        
//         const tTokenTotalSupply = await this.pool.callReadMethod('totalSupply');
//         logger.info(`getPoolInfo > total staked - ${underlyingToken.symbol}: ${underlyingToken.readableAmount(tTokenTotalSupply)}`);
//     }
// }

const main = async () => {
    const voteTracker = new ContractHelper('0x7A9A3395afB32F923a142dBC56467Ae5675Ce5ec', './Polygon/Tokemak/vote.tracker.json', Config.POLYGON);
    const ret = await voteTracker.callReadMethod('getSystemVotes');
    console.log(ret)
};

main().catch((e) => {
    logger.error(e.message);
});
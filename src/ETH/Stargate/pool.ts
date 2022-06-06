import { LoggerFactory } from '../../library/LoggerFactory';
import BigNumber from 'bignumber.js';
import { ContractHelper } from '../../library/contract.helper';
import { SwissKnife } from '../../library/swiss.knife';
import { Config } from './config';
import { ERC20Token } from '../../library/erc20.token';

const logger = LoggerFactory.getInstance().getLogger('farming');
//const smeltSaving = SmeltSaving.getInstance(Config.smeltSavings);
const swissKnife = new SwissKnife(Config.network);

export class Pool {
    public readonly address: string;
    private itself: ContractHelper;
    private hideExceptionOutput: boolean;
 

    constructor(address: string) {
        this.itself = new ContractHelper(address, './ETH/Stargate/pool.json', Config.network);
        this.address = address;
        this.hideExceptionOutput = false;
    }

    public toggleHiddenExceptionOutput() {
        this.hideExceptionOutput = !this.hideExceptionOutput;
    }
 
    public async getMaxWithdrawable() {
        const tokenAddress = await this.itself.callReadMethod('token')
        const token = await swissKnife.syncUpTokenDB(tokenAddress);
        logger.info(`getMaxWithdrawable > token - ${token.symbol}: ${token.address}`);
        
        const totalLiquidity = await this.itself.callReadMethod('totalLiquidity')
        const totalSupply = await this.itself.callReadMethod('totalSupply')
        const deltaCredit = await this.itself.callReadMethod('deltaCredit')

        logger.info(`getMaxWithdrawable > deltaCredit: ${deltaCredit}`)
        let capAmountLP = new BigNumber(deltaCredit).multipliedBy(totalSupply).dividedBy(totalLiquidity)

        let maxAmountLD = new BigNumber(capAmountLP).multipliedBy(totalLiquidity).dividedBy(totalSupply)
        logger.info(`getMaxWithdrawable > max withdrawable token - ${token.symbol}: ${token.readableAmountFromBN(maxAmountLD)}`);
    }
}

const main = async () => {
    const pool = new Pool(Config.pool.usdt);
    await pool.getMaxWithdrawable()
};

main().catch((e) => {
    logger.error(e.message);
});
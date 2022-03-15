import { LoggerFactory } from '../../library/LoggerFactory';
import BigNumber from 'bignumber.js';
import { ContractHelper } from '../../library/contract.helper';
import { SwissKnife } from '../../library/swiss.knife';
import { Config } from './Config';
import { ERC20Token } from '../../library/erc20.token';


const logger = LoggerFactory.getInstance().getLogger('SmeltSaving');
const swissKnife = new SwissKnife(Config.network);

export class SmeltSaving {
    public readonly address: string;
    private vault: ContractHelper;
    private hideExceptionOutput: boolean;

    private constructor(address: string) {
        this.vault = new ContractHelper(address, './Avalanche/Defrost/smelt.saving.json', Config.network);
        this.address = address;
        this.hideExceptionOutput = false;
    }

    private static instance: SmeltSaving;

    static getInstance(address: string) {
        if (!SmeltSaving.instance) {
            SmeltSaving.instance = new SmeltSaving(address);
        }
        return SmeltSaving.instance;
    }

    public toggleHiddenExceptionOutput() {
        this.hideExceptionOutput = !this.hideExceptionOutput;
    }
 
    public async getMeltAmount(smeltAmount: BigNumber): Promise<BigNumber> {
        const meltToken = await swissKnife.syncUpTokenDB(Config.MELT);
        const smeltToken = await swissKnife.syncUpTokenDB(Config.SMELT);

        logger.info(`getMeltAmount >  ${smeltToken.symbol}: ${smeltToken.readableAmountFromBN(smeltAmount).toFixed(6)}`);
        //数值转换
        const meltAmount = await this.vault.callReadMethod('getMeltAmount', smeltAmount);
        logger.info(`getMeltAmount >  ${meltToken.symbol}: ${meltToken.readableAmount(meltAmount).toFixed(6)}`);
        return new BigNumber(meltAmount);
    }

    public async getSMeltAmount(meltAmount: BigNumber): Promise<BigNumber> {
        const meltToken = await swissKnife.syncUpTokenDB(Config.MELT);
        const smeltToken = await swissKnife.syncUpTokenDB(Config.SMELT);

        logger.info(`getMeltAmount >  ${meltToken.symbol}: ${meltToken.readableAmountFromBN(meltAmount).toFixed(6)}`);
        //数值转换
        const smeltAmount = await this.vault.callReadMethod('getSMeltAmount', meltAmount);
        logger.info(`getMeltAmount >  ${smeltToken.symbol}: ${smeltToken.readableAmount(smeltAmount).toFixed(6)}`);
        return new BigNumber(smeltAmount);
    }

    public getUserReceipt = async (userAddress: string) => {
        const meltToken = await swissKnife.syncUpTokenDB(Config.MELT);

        const meltBalance = await this.vault.callReadMethod('totalStakedFor', userAddress);
        logger.info(`getUserReceipt > my staked ${meltToken.symbol}: ${meltToken.readableAmount(meltBalance)}`);
    };

    public getAPRPlusAPY = async () => {
        //每天利息率，decimal=1e27
        const interestRate = await this.vault.callReadMethod('interestRate');
        const interestRatePerDay = new BigNumber(interestRate).dividedBy(1e27);
        logger.info(`getAPRPlusAPY > interest rate per day: ${interestRatePerDay.multipliedBy(100).toNumber().toFixed(2)}%`);
        //apr= annual percentage rate
        const apr = new BigNumber(interestRate).multipliedBy(365).dividedBy(1e27);
        logger.info(`getAPRPlusAPY > APR: ${apr.multipliedBy(100).toNumber().toFixed(2)}%`);
        //每天复投一次，复投周期一年，公式：APY = [1 + (APR / Number of Periods)]^(Number of Periods) - 1
        const apy = Math.pow(apr.dividedBy(365).plus(1).toNumber(), 365) - 1;
        logger.info(`getAPRPlusAPY > APR: ${(apy * 100).toFixed(2)}%`);
    };

}

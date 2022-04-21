import { LoggerFactory } from '../../library/LoggerFactory';
import BigNumber from 'bignumber.js';
import { ContractHelper } from '../../library/contract.helper';
import { SwissKnife } from '../../library/swiss.knife';
import { Config } from './Config';
import { ERC20Token } from '../../library/erc20.token';

type TokenBalance = {
    token: ERC20Token;
    balance: number;
};

// export enum NetworkType {
//     Queen,
//     Bishop,
//     Rook
// }

const logger = LoggerFactory.getInstance().getLogger('TWAPOracle');
const swissKnife = new SwissKnife(Config.network);

export class TWAPOracle {
    public readonly address: string;
    private cHelper: ContractHelper;
    private hideExceptionOutput: boolean;

    constructor(address: string) {
        this.cHelper = new ContractHelper(address, './BSC/Tranchess/twap.oracle.json', Config.network);
        this.address = address;
        this.hideExceptionOutput = false;
    }

    public toggleHiddenExceptionOutput() {
        this.hideExceptionOutput = !this.hideExceptionOutput;
    }

    public async getLastTimestamp() {
        return await this.cHelper.callReadMethod('lastTimestamp'); 
    }
    
}



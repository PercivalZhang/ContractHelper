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

export class VoucherNFT {
    public readonly address: string;
    private itself: ContractHelper;
    private hideExceptionOutput: boolean;

    // constructor(voucherAddress: string) {
    //     this.itself = new ContractHelper(voucherAddress, './Arbitrum/izumi/booster.json', Config.network);
    //     this.address = poolAddress;
    //     this.hideExceptionOutput = false;
    // }

    // public toggleHiddenExceptionOutput() {
    //     this.hideExceptionOutput = !this.hideExceptionOutput;
    // }
}
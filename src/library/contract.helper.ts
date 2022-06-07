import Web3 from 'web3';
import { LoggerFactory } from './LoggerFactory';
import BigNumber from 'bignumber.js';
import * as path from 'path';
import fs from 'fs';
import { Contract } from 'web3-eth-contract';
import { Account, TransactionReceipt } from 'web3-core';

import { Web3Factory, NetworkType } from './web3.factory';

const logger = LoggerFactory.getInstance().getLogger('ContractHelper');

const MaxGas = 700000;

export class ContractHelper {
    public web3: Web3;
    public readonly address: string;
    private abiFileName: string;
    private contract: Contract;
    private hideExceptionOutput: boolean;

    constructor(address: string, abiFileName: string, network: NetworkType) {
        this.abiFileName = abiFileName;
        this.address = address;

        this.web3 = Web3Factory.getInstance().getWeb3(network);

        const pathABIFile = path.resolve('abi', abiFileName);
        const apiInterfaceContract = JSON.parse(fs.readFileSync(pathABIFile).toString());
        this.contract = new this.web3.eth.Contract(apiInterfaceContract, address);
        this.hideExceptionOutput = false;
    }

    public setDefaultBlock(blockNumber: number) {
        this.contract.defaultBlock = blockNumber;
    }

    public toggleHiddenExceptionOutput() {
        this.hideExceptionOutput = !this.hideExceptionOutput;
    }

    public async getBlockHeight(): Promise<number> {
        return this.web3.eth.getBlockNumber();
    }
    
    public getCallData(
        methodName: string,
        ...args: any[]
    ) {
        return this.contract.methods[methodName](...args).encodeABI();
    }

    public async callWriteMethod(
        signer: Account,
        methodName: string,
        gasPrice: string,
        value = 0,
        ...args: any[]
    ): Promise<TransactionReceipt> {
        try {
            logger.info(`callWriteMethod > ${methodName} : ${args}`);
            logger.info(`callWriteMethod > value : ${value}`);

            logger.debug(`callWriteMethod > input gas price: ${gasPrice} gwei`);

            const currentGasPrice = await this.web3.eth.getGasPrice(); // string wei
            logger.info(`callWriteMethod > current gas price: ${currentGasPrice} wei`);
            const currentGasPriceBN = new BigNumber(currentGasPrice);

            gasPrice = this.web3.utils.toWei(gasPrice, 'gwei');
            logger.debug(`callWriteMethod > input gas price: ${gasPrice} wei`);
            
            const inputGasPriceBN = new BigNumber(gasPrice);

            if(inputGasPriceBN.lte(currentGasPriceBN))
                gasPrice = currentGasPrice;
          
            logger.info(`callWriteMethod > gas price: ${gasPrice} wei`);

            const nonce = await this.web3.eth.getTransactionCount(signer.address);
            const callData = this.contract.methods[methodName](...args).encodeABI();

            const unsignedTX = {
                nonce,
                gas: this.web3.utils.toHex(MaxGas),
                gasPrice: this.web3.utils.toHex(gasPrice),
                from: signer.address,
                to: this.address,
                value: this.web3.utils.toHex(value),
                data: callData,
            };

            logger.info(`sign and broadcast...`);
            const signedTX = await signer.signTransaction(unsignedTX);
            // 广播交易
            const txReceipt = await this.web3.eth.sendSignedTransaction(signedTX.rawTransaction);
            logger.info(`callWriteMethod > ${txReceipt.transactionHash}`);
            return txReceipt;
        } catch (e) {
            if (!this.hideExceptionOutput) {
                logger.error(`callWriteMethod> ${e.message}`);
            }
        }
    }

    public async callReadMethodWithFrom(methodName: string, fromUser: string, ...args: any[]): Promise<any> {
        try {
            logger.debug(`call method - ${methodName} : ${args}`);
            const ret = await this.contract.methods[methodName](...args).call({ from: fromUser });
            logger.debug(`callReadMethod > ${JSON.stringify(ret)}`);
            return ret;
        } catch (e) {
            if (!this.hideExceptionOutput) {
                logger.error(`methodName: ${methodName}`);
                logger.error(`callReadMethod> ${e.message}`);
            }
            return false;
        }
    }

    public async callReadMethod(methodName: string, ...args: any[]): Promise<any> {
        try {
            logger.debug(`call method - ${methodName} : ${args}`);
            const ret = await this.contract.methods[methodName](...args).call();
            logger.debug(`callReadMethod > ${JSON.stringify(ret)}`);
            return ret;
        } catch (e) {
            if (!this.hideExceptionOutput) {
                logger.error(`methodName: ${methodName}`);
                logger.error(`callReadMethod> ${e.message}`);
            }
            return false;
        }
    }

    public subscribeLogEvent() {
        this.contract
            .getPastEvents(
                'TransferReward',
                {
                    fromBlock: 5101060,
                    toBlock: 'latest',
                },
                function (error, events) {
                    console.log(events);
                },
            )
            .then(function (events) {
                console.log('sdfjklsdjflkdsf');
                console.log(events); // same results as the optional callback above
            });
    }
}

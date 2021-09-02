import * as path from 'path';
import Web3 from 'web3';
import fs from 'fs';
import { Contract } from 'web3-eth-contract';

import { LoggerFactory } from './LoggerFactory';
import { JSONDBBuilder } from './db.json';
import { NetworkType, Web3Factory } from './web3.factory';

const logger = LoggerFactory.getInstance().getLogger('Helper');

export interface Token {
    address: string;
    symbol: string;
    decimals: number;
}

export class SwissKnife {
    protected readonly web3: Web3;
    protected tokenDB: JSONDBBuilder;

    public constructor(network: NetworkType) {
        this.web3 = Web3Factory.getInstance().getWeb3(network);
        this.tokenDB = new JSONDBBuilder(path.resolve('db/token.db'), true, true, '/');
    }

    public async syncUpTokenDB(tokenAddress: string, contract?: Contract): Promise<Token> {
        logger.info(`syncUpTokenDB(${tokenAddress})`);
        let tokenContract = contract;
        try {
            const chainId = await this.web3.eth.net.getId();
            logger.debug(`chain id: ${chainId}`);
            const token = await this.tokenDB.getData('/' + chainId + '/' + tokenAddress.toLowerCase());
            if (!token) {
                if (!tokenContract) {
                    logger.debug(`no contract provided`);
                    logger.debug(`loading contract by token address: ${tokenAddress}`);
                    const pathABIFile = path.resolve('abi', 'erc20.json');
                    logger.debug(`load api from local abi file: ${pathABIFile}`);
                    const apiInterfaceContract = JSON.parse(fs.readFileSync(pathABIFile).toString());
                    tokenContract = new this.web3.eth.Contract(apiInterfaceContract, tokenAddress);
                }
                let symbol = await tokenContract.methods.symbol().call();
                if (symbol.substr(0, 2) === '0x') {
                    symbol = Web3.utils.toAscii(symbol);
                }
                const decimals = Number.parseInt(await tokenContract.methods.decimals().call());
                logger.debug(`add new token - ${symbol} into local token db at ${tokenAddress}`);
                this.tokenDB.push('/' + chainId + '/' + tokenAddress.toLowerCase(), {
                    symbol: symbol,
                    decimals: decimals,
                });

                return { symbol: symbol, decimals: decimals, address: tokenAddress };
            }
            token['address'] = tokenAddress;
            return token;
        } catch (e) {
            logger.error(`syncUpTokenDB > ${e.toString()}`);
        }
    }
}

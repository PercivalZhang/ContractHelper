import * as path from 'path';
import Web3 from 'web3';
import fs from 'fs';
import { Contract } from 'web3-eth-contract';
import BigNumber from 'bignumber.js';
import { LoggerFactory } from './LoggerFactory';
import { JSONDBBuilder } from './db.json';
import { NetworkType, Web3Factory } from './web3.factory';

const logger = LoggerFactory.getInstance().getLogger('Helper');

export interface Token {
    address: string;
    symbol: string;
    decimals: number;
}
1;
export interface LPToken {
    token0: Token;
    token1: Token;
    reserve0: BigNumber;
    reserve1: BigNumber;
    totalSupply: BigNumber;
}

export class SwissKnife {
    protected readonly web3: Web3;
    protected tokenDB: JSONDBBuilder;

    public constructor(network: NetworkType) {
        this.web3 = Web3Factory.getInstance().getWeb3(network);
        this.tokenDB = new JSONDBBuilder(path.resolve('db/token.db'), true, true, '/');
    }

    public async syncUpTokenDB(tokenAddress: string, contract?: Contract): Promise<Token> {
        logger.debug(`syncUpTokenDB(${tokenAddress})`);
        let tokenContract = contract;
        try {
            const chainId = await this.web3.eth.net.getId();
            logger.debug(`chain id: ${chainId}`);
            const token = await this.tokenDB.getData('/' + chainId + '/' + tokenAddress.toLowerCase());
            if (!token) {
                if (tokenAddress.toLowerCase() === '0x0000000000000000000000000000000000000000') {
                    switch (chainId) {
                        case 137:
                            this.tokenDB.push('/' + chainId + '/' + tokenAddress.toLowerCase(), {
                                symbol: 'MATIC',
                                decimals: 18,
                            });
                            break;
                    }
                } else {
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
                }
                const newToken = await this.tokenDB.getData('/' + chainId + '/' + tokenAddress.toLowerCase());
                newToken['address'] = tokenAddress;
                return newToken;
            }
            token['address'] = tokenAddress;
            return token;
        } catch (e) {
            logger.error(`syncUpTokenDB(${tokenAddress}) > ${e.toString()}`);
        }
    }

    public async isLPToken(address: string): Promise<boolean> {
        try {
            const pathABIFile = path.resolve('abi', 'pair.json');
            logger.debug(`load api from local abi file: ${pathABIFile}`);
            const apiInterfaceContract = JSON.parse(fs.readFileSync(pathABIFile).toString());
            const lpContract = new this.web3.eth.Contract(apiInterfaceContract, address);

            await lpContract.methods.token0().call();
            return true;
        } catch (e) {
            return false;
        }
    }

    public async getLPTokenDetails(address: string): Promise<LPToken> {
        try {
            const pathABIFile = path.resolve('abi', 'pair.json');
            logger.debug(`load api from local abi file: ${pathABIFile}`);
            const apiInterfaceContract = JSON.parse(fs.readFileSync(pathABIFile).toString());
            const lpContract = new this.web3.eth.Contract(apiInterfaceContract, address);

            const token0Address = await lpContract.methods.token0().call();
            const token1Address = await lpContract.methods.token1().call();

            const token0 = await this.syncUpTokenDB(token0Address);
            const token1 = await this.syncUpTokenDB(token1Address);

            const reserves = await lpContract.methods.getReserves().call();
            const totalSupply = await lpContract.methods.totalSupply().call();

            const lpt: LPToken = {
                token0,
                token1,
                reserve0: new BigNumber(reserves[0]),
                reserve1: new BigNumber(reserves[1]),
                totalSupply: new BigNumber(totalSupply),
            };
            return lpt;
        } catch (e) {
            logger.error(`syncUpTokenDB > ${e.toString()}`);
        }
    }
}

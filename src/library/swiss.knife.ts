import * as path from 'path';
import Web3 from 'web3';
import fs from 'fs';
import { Contract } from 'web3-eth-contract';
import BigNumber from 'bignumber.js';
import { LoggerFactory } from './LoggerFactory';
import { JSONDBBuilder } from './db.json';
import { NetworkType, Web3Factory } from './web3.factory';
import { ERC20Token } from './erc20.token';
import { ContractHelper } from './contract.helper';

const logger = LoggerFactory.getInstance().getLogger('SwissKnife');

// export interface Token {
//     address: string;
//     symbol: string;
//     decimals: number;
// }
export enum EVMDataType {
    STRING,
    UINT256,
    ADDRESS
}
export interface LPToken {
    token0: ERC20Token;
    token1: ERC20Token;
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

    public async getProxyAdminAddress(proxyAddress: string): Promise<string> {
        const proxyAdminAddress = await this.web3.eth.getStorageAt(proxyAddress, '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103')
        return proxyAdminAddress
    }
    public decode(pType: EVMDataType, hex: string) {
        switch(pType) {
            case EVMDataType.STRING:
                return this.web3.eth.abi.decodeParameter('string', hex)
            case EVMDataType.UINT256:  
                return this.web3.eth.abi.decodeParameter('uint256', hex)  
            case EVMDataType.ADDRESS:
                return this.web3.eth.abi.decodeParameter('address', hex)    
        }
    }
    public decodeArray(typesArray: Array<String|Object>, hex: string) {
        return this.web3.eth.abi.decodeParameters(typesArray, hex)    
    }

    public async syncUpTokenDB(tokenAddress: string, contract?: Contract): Promise<ERC20Token> {
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
                } else if(tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
                    switch (chainId) {
                        case 1:
                            this.tokenDB.push('/' + chainId + '/' + tokenAddress.toLowerCase(), {
                                symbol: 'ETH',
                                decimals: 18,
                            });
                            break;
                    }
                } 
                else {
                    if (!tokenContract) {
                        logger.debug(`no contract provided`);
                        logger.debug(`loading contract by token address: ${tokenAddress}`);
                        try {
                            const pathABIFile = path.resolve('abi', 'erc20.json');
                            logger.debug(`load api from local abi file: ${pathABIFile}`);
                            const apiInterfaceContract = JSON.parse(fs.readFileSync(pathABIFile).toString());
                            tokenContract = new this.web3.eth.Contract(apiInterfaceContract, tokenAddress);
                            /**
                             * 部分erc20 token的symbol返回bytes，而不是string
                             * 该行代码验证symbol是否不是string
                             * 如果不是捕获错误，重新加载bytes的ABI文件
                             */
                            await tokenContract.methods.symbol().call();
                        } catch (e) {
                            logger.warn(`detected non-standard erc20 token, try loading erc20.1 ABI...`);
                            const pathABIFile = path.resolve('abi', 'erc20.1.json');
                            logger.debug(`load api from local abi file: ${pathABIFile}`);
                            const apiInterfaceContract = JSON.parse(fs.readFileSync(pathABIFile).toString());
                            tokenContract = new this.web3.eth.Contract(apiInterfaceContract, tokenAddress);
                        }
                    }
                    let symbol = await tokenContract.methods.symbol().call();
                    symbol = symbol.replace(/0+$/, '');
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
                const erc20Token = new ERC20Token(newToken['address'], newToken['symbol'], newToken['decimals']);
                return erc20Token;
            }
            token['address'] = tokenAddress;
            const erc20Token = new ERC20Token(token['address'], token['symbol'], token['decimals']);
            return erc20Token;
        } catch (e) {
            logger.error('upper catch errors.....');
            logger.error(`syncUpTokenDB(${tokenAddress}) > ${e.toString()}`);
        }
    }

    public async isLPToken(address: string): Promise<boolean> {
        try {
            const pathABIFile = path.resolve('abi', 'pair.json');
            logger.debug(`load api from local abi file: ${pathABIFile}`);
            const apiInterfaceContract = JSON.parse(fs.readFileSync(pathABIFile).toString());
            const lpContract = new this.web3.eth.Contract(apiInterfaceContract, address);

            const token0 = await lpContract.methods.token0().call();
            console.log(token0);
            return true;
        } catch (e) {
            logger.warn(e.message);
            return false;
        }
    }

    public async getERC20TokenBalance(erc20TokenAddress: string, userAddress: string): Promise<number> {
        const token = await this.syncUpTokenDB(erc20TokenAddress)
        const pathABIFile = path.resolve('abi', 'erc20.json');
        const apiInterfaceContract = JSON.parse(fs.readFileSync(pathABIFile).toString());
        const erc20 = new this.web3.eth.Contract(apiInterfaceContract, erc20TokenAddress);
        const balance = await erc20.methods.balanceOf(userAddress).call()
        return token.readableAmount(balance)
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
            logger.error(`getLPTokenDetails > ${e.toString()}`);
        }
    }

    public getWeb3() {
        return this.web3;
    }

    public async getBlockHeight(): Promise<number> {
        return await this.web3.eth.getBlockNumber();
    }
    public async getBlockTimestamp(blockNumber: string) {
        const block = await this.web3.eth.getBlock(blockNumber);
        return block.timestamp
    }
    public async getLatestBlockTimestamp() {
        const blockHeight = await this.web3.eth.getBlockNumber()
        const block = await this.web3.eth.getBlock(blockHeight);
        return block.timestamp
    }
}

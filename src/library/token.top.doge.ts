import * as path from 'path';
import Web3 from 'web3';
import fs from 'fs';
import { Contract } from 'web3-eth-contract';
import BigNumber from 'bignumber.js';
import { LoggerFactory } from './LoggerFactory';
import { JSONDBBuilder } from './db.json';
import { NetworkType, Web3Factory } from './web3.factory';
import { ERC20Token } from './erc20.token';
import { ChainScanner } from './evm.scanner';


const logger = LoggerFactory.getInstance().getLogger('TokenTopDoge');


export class TokenTopDoge {
    protected readonly network: NetworkType;
    protected readonly web3: Web3;
    protected scanner: ChainScanner;
    protected tokenTopDB: JSONDBBuilder;

    public constructor(network: NetworkType) {
        this.network = network;
        this.web3 = Web3Factory.getInstance().getWeb3(network);
        this.tokenTopDB = new JSONDBBuilder(path.resolve('db/token.top.db'), true, true, '/');
        this.scanner = ChainScanner.getInstance();
    }

    public async fetchTopUserBalance(tokenAddress: string, page: number, offset: number = 8) {
        let url = 'https://api.bscscan.com/api?module=token&action=tokenholderlist'
        switch (this.network) {
            case NetworkType.BSC:
                url = url + '&contractaddress=' + tokenAddress + '&page=1&offset=' + offset + '&apikey=IRDB9GUR117CS5HHPWJB7SA11YUEFIQCQZ';
            default:
                url = url;
        }
        console.log(url)
        const ret = await this.scanner.fetchData(url);
        console.log(ret);
    }
}

const main = async() => {
    const doge = new TokenTopDoge(NetworkType.BSC);
    await doge.fetchTopUserBalance('0xD44FD09d74cd13838F137B590497595d6b3FEeA4', 1, 6);
}
main().catch((e) => {
    logger.error(e.message);
});

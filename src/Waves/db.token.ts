import * as path from 'path';
import { LoggerFactory } from '../library/LoggerFactory';
import { JSONDBBuilder } from '../library/db.json'
import { ERC20Token } from '../library/erc20.token'

const logger = LoggerFactory.getInstance().getLogger('TokenDB');

export class TokenDB {
    protected tokenDB: JSONDBBuilder;

    private static instance: TokenDB;

    private constructor() {
        this.tokenDB = new JSONDBBuilder(path.resolve('./token.db'), true, true, '/');
    }
    
    static getInstance() {
        if (!TokenDB.instance) {
            TokenDB.instance = new TokenDB();
        }
        return TokenDB.instance;
    }

    public async syncUp(token: ERC20Token): Promise<ERC20Token> {
        logger.info(`syncUp(${token.address}, ${token.symbol})`);
        try {
            const tokenData = await this.tokenDB.getData('/' + token.address.toLowerCase());
            if (!tokenData) {
                this.tokenDB.push('/' + token.address.toLowerCase(), {
                    symbol: token.symbol,
                    decimals: token.decimals,
                });
            } 
            return token;    
        } catch (e) {
            logger.error('upper catch errors.....');
            logger.error(`syncUp(${token.address}) > ${e.toString()}`);
        }
    }  

    public async getByAddress(address: string): Promise<ERC20Token> {
        const tokenData = await this.tokenDB.getData('/' + address.toLowerCase());
        if(tokenData) {
            return new ERC20Token(address, tokenData['symbol'], tokenData['decimals']);
        }
        return null;
    }
}
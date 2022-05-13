import * as path from 'path';
import { connect, ConnectConfig, Near, Account } from "near-api-js";
import { ChainConfig as Config } from './config';
import { LoggerFactory } from '../library/LoggerFactory';
import { JSONDBBuilder } from '../library/db.json'
import { ERC20Token } from '../library/erc20.token'

const logger = LoggerFactory.getInstance().getLogger('TokenDB');

export class TokenDB {
    protected tokenDB: JSONDBBuilder;
    private config: ConnectConfig
    private connected: boolean
    private near: Near;
    private defaultAccount: Account;
    private static instance: TokenDB;

    private constructor(config: ConnectConfig) {
        this.tokenDB = new JSONDBBuilder(path.resolve('./db/Near/token.db'), true, true, '/');
        this.config = config;
        this.connected = false;
    }
    
   
    static getInstance(config: ConnectConfig) {
        if (!TokenDB.instance) {
            TokenDB.instance = new TokenDB(config);
        }
        return TokenDB.instance;
    }

    private async checkConnection() {
        if (!this.connected) {
            logger.warn(`checkConnecttion > no connection to Near network.`);
            await this.connectToNetwork()
        }
    }

    public async connectToNetwork() {
        this.near = await connect(this.config);
        this.connected = true;
        logger.info(`connectToNetwork > connected to Near network - ${this.config.networkId}`);
        this.defaultAccount = await this.near.account(Config.account.default);
    }

    public async syncUp(tokenId: string): Promise<ERC20Token> {
        logger.info(`syncUp(${tokenId})`);
        await this.checkConnection();
        try {
            const tokenData = await this.tokenDB.getData('/' + tokenId);
            if (!tokenData) {
                logger.info(`Token - ${tokenId} does not exist`);

                const tokenMetadata = await this.defaultAccount.viewFunction(tokenId, 'ft_metadata');
                this.tokenDB.push('/' + tokenId, {
                    symbol: tokenMetadata.symbol,
                    decimals: tokenMetadata.decimals,
                });
                return new ERC20Token(tokenId, tokenMetadata.symbol, tokenMetadata.decimals);
            }
            return new ERC20Token(tokenId, tokenData.symbol, tokenData.decimals);;    
        } catch (e) {
            logger.error('upper catch errors.....');
            logger.error(`syncUp(${tokenId}) > ${e.toString()}`);
        }
    } 
}
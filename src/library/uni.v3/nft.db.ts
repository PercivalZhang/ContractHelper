import * as path from 'path';
import { LoggerFactory } from '../../library/LoggerFactory';
import { JSONDBBuilder } from '../../library/db.json';
import { ERC20Token } from '../../library/erc20.token';
import { UniV3NFTPosition } from './uni.v3';

const logger = LoggerFactory.getInstance().getLogger('TokenDB');

export class NFTDB {
    protected nftDB: JSONDBBuilder;

    private static instance: NFTDB;

    private constructor() {
        this.nftDB = new JSONDBBuilder(path.resolve('./db/UniV3/nft.db'), true, true, '/');
    }

    static getInstance() {
        if (!NFTDB.instance) {
            NFTDB.instance = new NFTDB();
        }
        return NFTDB.instance;
    }

    public async syncUp(position: UniV3NFTPosition): Promise<UniV3NFTPosition> {
        logger.info(`syncUp(${position.id})`);
        try {
            const nftData = await this.nftDB.getData('/' + position.id);
            if (!nftData) {
                logger.info(`Add Position NFT - ${position.id} to local DB`);
                this.nftDB.push('/' + position.id, position);
            } else {
                logger.info(`Position NFT - ${position.id} already existed`);
            }
            return position;
        } catch (e) {
            logger.error('upper catch errors.....');
            logger.error(`syncUp(${position.id}) > ${e.toString()}`);
        }
    }

    public async getById(posId: string): Promise<UniV3NFTPosition> {
        const nftData = await this.nftDB.getData('/' + posId);
        if (nftData) {
            const postion: UniV3NFTPosition = {
                id: nftData['id'],
                tickLower: nftData['tickLower'],
                tickUpper: nftData['tickUpper'],
                priceLower: nftData['priceLower'],
                priceUpper: nftData['priceUpper'],
                liquidity: nftData['liquidity'],
                token0: nftData['token0'],
                token1: nftData['token1'],
                fee: nftData['fee'],
                pool: nftData['pool'],
            };
            return postion;
        }
        return null;
    }
}

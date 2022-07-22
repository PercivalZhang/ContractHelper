import * as path from 'path';
import { LoggerFactory } from '../LoggerFactory';
import { JSONDBBuilder } from '../db.json';
import { UniV3NFTPosition } from './uni.v3.pm';
import { NetworkType, Web3Factory } from '../web3.factory';
import JSBI from 'jsbi';
import { SwissKnife, EVMDataType } from '../swiss.knife';
import { ContractHelper } from '../contract.helper';

export type PoolImmutables = {
    factory: string;
    token0: string;
    token1: string;
    fee: number;
    tickSpacing: number;
    maxLiquidityPerTick: JSBI;
}

const logger = LoggerFactory.getInstance().getLogger('UniV3JSONDB');

export class UniV3JSONDB {
    protected nftDB: JSONDBBuilder;
    protected poolDB: JSONDBBuilder;
    private static instance: UniV3JSONDB;

    private constructor() {
        this.nftDB = new JSONDBBuilder(path.resolve('./db/UniV3/nft.db'), true, true, '/')
        this.poolDB = new JSONDBBuilder(path.resolve('./db/UniV3/pool.db'), true, true, '/')
    }

    static getInstance() {
        if (!UniV3JSONDB.instance) {
            UniV3JSONDB.instance = new UniV3JSONDB();
        }
        return UniV3JSONDB.instance;
    }

    public async syncUpPoolwithImmutableData(poolAddress: string, network: NetworkType): Promise<PoolImmutables> {
        logger.info(`syncUpPool > (${poolAddress})`)
        const swissKnife = new SwissKnife(network)
        try {
            const chainId = Web3Factory.getInstance().getChainId(network)
            const poolImmutableData = await this.poolDB.getData('/' + chainId + '/' + poolAddress)
            if (!poolImmutableData) {
                logger.info(`syncUpPoolwithImmutableData > Pool - ${poolAddress} immutable data does not exist`)

                const multicallAddress = Web3Factory.getInstance().getMultiCallAddress(network)
                const multicallHelper = new ContractHelper(multicallAddress, './ETH/Curve/multicall.json', network)
                const poolContract = new ContractHelper(poolAddress, './Uniswap/v3/pool.json', network)

                const inputs = [
                    { target: poolAddress, callData: poolContract.getCallData('factory') },
                    { target: poolAddress, callData: poolContract.getCallData('token0') },
                    { target: poolAddress, callData: poolContract.getCallData('token1') },
                    { target: poolAddress, callData: poolContract.getCallData('fee') },
                    { target: poolAddress, callData: poolContract.getCallData('tickSpacing') },
                    { target: poolAddress, callData: poolContract.getCallData('maxLiquidityPerTick') },
                ]
                const datas = await multicallHelper.callReadMethod('aggregate', inputs)
                const factory = swissKnife.decode(EVMDataType.ADDRESS, datas['1'][0])
                const token0 = swissKnife.decode(EVMDataType.ADDRESS, datas['1'][1])
                const token1 = swissKnife.decode(EVMDataType.ADDRESS, datas['1'][2])
                const fee = swissKnife.decode(EVMDataType.UINT256, datas['1'][3])
                const tickSpacing = swissKnife.decode(EVMDataType.UINT256, datas['1'][4])
                const maxLiquidityPerTick = swissKnife.decode(EVMDataType.UINT256, datas['1'][5])

                const immutables: PoolImmutables = {
                    factory,
                    token0,
                    token1,
                    fee: Number.parseInt(fee),
                    tickSpacing: Number.parseInt(tickSpacing),
                    maxLiquidityPerTick: JSBI.BigInt(maxLiquidityPerTick)
                };
                this.poolDB.push('/' + chainId + '/' + poolAddress, immutables);
                return immutables
            } 
            logger.info(`syncUpPoolwithImmutableData > Pool - ${poolAddress} immutable data already existed`)
            return poolImmutableData
        } catch (e) {
            logger.error(`syncUpPoolwithImmutableData(${poolAddress}) > ${e.toString()}`)
        }
    }

    public async syncUpPosition(position: UniV3NFTPosition): Promise<UniV3NFTPosition> {
        logger.info(`syncUpPosition(${position.id})`);
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

    public async getPositionById(posId: string): Promise<UniV3NFTPosition> {
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

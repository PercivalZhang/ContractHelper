import { NetworkType, Web3Factory } from '../web3.factory';
import { SwissKnife, EVMDataType } from '../swiss.knife';
import { defaultAbiCoder } from '@ethersproject/abi';
import { getCreate2Address } from '@ethersproject/address';
import { keccak256 } from '@ethersproject/solidity';
import { LoggerFactory } from '../LoggerFactory';
import { UniV3JSONDB, PoolImmutables } from './uni.v3.db';
import { ethers } from 'ethers';
import { Pool as UniV3Pool } from '@uniswap/v3-sdk';
import { Token } from '@uniswap/sdk-core';
import { ContractHelper } from '../contract.helper';
import BigNumber from 'bignumber.js'
import JSBI from 'jsbi';

type PoolState = {
    liquidity: JSBI;
    sqrtPriceX96: JSBI;
    tick: number;
    observationIndex: number;
    observationCardinality: number;
    observationCardinalityNext: number;
    feeProtocol: number;
    unlocked: boolean;
}

type PoolInfo = {
    immutables: PoolImmutables,
    state: PoolState
}

const POOL_INIT_CODE_HASH = '0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54';

const logger = LoggerFactory.getInstance().getLogger('UniV3Util');
const gUniV3DB = UniV3JSONDB.getInstance()

export class UniV3Util {
    private network: NetworkType;
    private swissKnife: SwissKnife;
    private static instance: UniV3Util;

    private constructor(network: NetworkType) {
        this.swissKnife = new SwissKnife(network);
        this.network = network
    }

    static getInstance(network: NetworkType) {
        if (!UniV3Util.instance) {
            UniV3Util.instance = new UniV3Util(network);
        }
        return UniV3Util.instance;
    }

    /**
     * Computes a pool address
     * @param factoryAddress The Uniswap V3 factory address
     * @param tokenA The first token of the pair, irrespective of sort order
     * @param tokenB The second token of the pair, irrespective of sort order
     * @param fee The fee tier of the pool
     * @param initCodeHashManualOverride Override the init code hash used to compute the pool address if necessary
     * @returns The pool address
     */
    public static computePoolAddress(
        factoryAddress: string,
        token0: string,
        token1: string,
        fee: number,
        initCodeHashManualOverride?: string,
    ): string {
        //const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA]; // does safety checks
        const salt = keccak256(
            ['bytes'],
            [defaultAbiCoder.encode(['address', 'address', 'uint24'], [token0, token1, fee])],
        );
        //console.log(salt);
        return getCreate2Address(factoryAddress, salt, initCodeHashManualOverride ?? POOL_INIT_CODE_HASH);
    }

    public async getPoolRawInfo(poolAddress: string, ignoreImmutable=true) {
        logger.info(`getPoolInfo > ${poolAddress}`)
        try {
            const multicallAddress = Web3Factory.getInstance().getMultiCallAddress(this.network)
            const multicallHelper = new ContractHelper(multicallAddress, './ETH/Curve/multicall.json', this.network)
            const poolContract = new ContractHelper(poolAddress, './Uniswap/v3/pool.json', this.network)
            let inputs = []
            if(!ignoreImmutable) {
                inputs.push(...[
                    { target: poolAddress, callData: poolContract.getCallData('factory') },
                    { target: poolAddress, callData: poolContract.getCallData('token0') },
                    { target: poolAddress, callData: poolContract.getCallData('token1') },
                    { target: poolAddress, callData: poolContract.getCallData('fee') },
                    { target: poolAddress, callData: poolContract.getCallData('tickSpacing') },
                    { target: poolAddress, callData: poolContract.getCallData('maxLiquidityPerTick') },
                ])
            }
            inputs.push(...[
                { target: poolAddress, callData: poolContract.getCallData('liquidity') },
                { target: poolAddress, callData: poolContract.getCallData('slot0') },
            ])

            console.log(inputs.length)
            const datas = await multicallHelper.callReadMethod('aggregate', inputs)

            
            if(!ignoreImmutable) {
                const factory = this.swissKnife.decode(EVMDataType.ADDRESS, datas['1'][0])
                const token0 = this.swissKnife.decode(EVMDataType.ADDRESS, datas['1'][1])
                const token1 = this.swissKnife.decode(EVMDataType.ADDRESS, datas['1'][2])
                const fee = this.swissKnife.decode(EVMDataType.UINT256, datas['1'][3])
                const tickSpacing = this.swissKnife.decode(EVMDataType.UINT256, datas['1'][4])
                const maxLiquidityPerTick = this.swissKnife.decode(EVMDataType.UINT256, datas['1'][5])
                const liquidity = this.swissKnife.decode(EVMDataType.UINT256, datas['1'][6])
                const slot0 = this.swissKnife.decodeArray(['uint160', 'int24', 'uint16', 'uint16', 'uint16', 'uint8', 'bool'], datas['1'][7])

                const poolInfo: PoolInfo = {
                    immutables: {
                        factory,
                        token0,
                        token1,
                        fee: Number.parseInt(fee),
                        tickSpacing: Number.parseInt(tickSpacing),
                        maxLiquidityPerTick: JSBI.BigInt(maxLiquidityPerTick) 
                    },
                    state: {
                        liquidity: JSBI.BigInt(liquidity),
                        sqrtPriceX96: JSBI.BigInt(slot0[0]),
                        tick: Number.parseInt(slot0[1]),
                        observationIndex: Number.parseInt(slot0[2]),
                        observationCardinality: Number.parseInt(slot0[3]),
                        observationCardinalityNext: Number.parseInt(slot0[4]),
                        feeProtocol: Number.parseInt(slot0[5]),
                        unlocked: Boolean(slot0[6]),
                    }
                }
                return poolInfo
            }
            const liquidity = this.swissKnife.decode(EVMDataType.UINT256, datas['1'][0])
            const slot0 = this.swissKnife.decodeArray(['uint160', 'int24', 'uint16', 'uint16', 'uint16', 'uint8', 'bool'], datas['1'][1])
            const poolInfo: PoolInfo = {
                immutables: null,
                state: {
                    liquidity: JSBI.BigInt(liquidity),
                    sqrtPriceX96: JSBI.BigInt(slot0[0]),
                    tick: Number.parseInt(slot0[1]),
                    observationIndex: Number.parseInt(slot0[2]),
                    observationCardinality: Number.parseInt(slot0[3]),
                    observationCardinalityNext: Number.parseInt(slot0[4]),
                    feeProtocol: Number.parseInt(slot0[5]),
                    unlocked: Boolean(slot0[6]),
                }
            }
            return poolInfo     
        } catch(e) {
            logger.error(`getPoolInfo > ${e.message}`)
        }
    }

    public async getPoolImmutables(poolAddress: string): Promise<PoolImmutables> {
        logger.info(`getPoolImmutables > ${poolAddress}`)
        try {
            const multicallAddress = Web3Factory.getInstance().getMultiCallAddress(this.network)
            const multicallHelper = new ContractHelper(multicallAddress, './ETH/Curve/multicall.json', this.network)
            const poolContract = new ContractHelper(poolAddress, './Uniswap/v3/pool.json', this.network)

            const inputs = [
                { target: poolAddress, callData: poolContract.getCallData('factory') },
                { target: poolAddress, callData: poolContract.getCallData('token0') },
                { target: poolAddress, callData: poolContract.getCallData('token1') },
                { target: poolAddress, callData: poolContract.getCallData('fee') },
                { target: poolAddress, callData: poolContract.getCallData('tickSpacing') },
                { target: poolAddress, callData: poolContract.getCallData('maxLiquidityPerTick') },
            ]
            const datas = await multicallHelper.callReadMethod('aggregate', inputs)

            const factory = this.swissKnife.decode(EVMDataType.ADDRESS, datas['1'][0]).toString()
            const token0 = this.swissKnife.decode(EVMDataType.ADDRESS, datas['1'][1]).toString()
            const token1 = this.swissKnife.decode(EVMDataType.ADDRESS, datas['1'][2]).toString()
            const fee = this.swissKnife.decode(EVMDataType.UINT256, datas['1'][3]).toString()
            const tickSpacing = this.swissKnife.decode(EVMDataType.UINT256, datas['1'][4]).toString()
            const maxLiquidityPerTick = new BigNumber(this.swissKnife.decode(EVMDataType.UINT256, datas['1'][5]).toString())

            const immutables: PoolImmutables = {
                factory,
                token0,
                token1,
                fee: Number.parseInt(fee),
                tickSpacing: Number.parseInt(tickSpacing),
                maxLiquidityPerTick: JSBI.BigInt(maxLiquidityPerTick)
            };
            return immutables;  
        } catch(e) {
            logger.error(`getPoolImmutables > ${e.message}`)
        }
    }

    public async getPoolState(poolAddress: string): Promise<PoolState> {
        logger.info(`getPoolState > ${poolAddress}`)
        try {
            const multicallAddress = Web3Factory.getInstance().getMultiCallAddress(this.network)
            const multicallHelper = new ContractHelper(multicallAddress, './ETH/Curve/multicall.json', this.network)
            const poolContract = new ContractHelper(poolAddress, './Uniswap/v3/pool.json', this.network)

            const inputs = [
                { target: poolAddress, callData: poolContract.getCallData('liquidity') },
                { target: poolAddress, callData: poolContract.getCallData('slot0') },
            ]
            const datas = await multicallHelper.callReadMethod('aggregate', inputs)
            const liquidity = JSBI.BigInt(this.swissKnife.decode(EVMDataType.UINT256, datas['1'][0]).toString())
            const slot0 = this.swissKnife.decodeArray(['uint160', 'int24', 'uint16', 'uint16', 'uint16', 'uint8', 'bool'], datas['1'][1])
            
            const poolState: PoolState = {
                liquidity,
                sqrtPriceX96: JSBI.BigInt(slot0[0]),
                tick: Number.parseInt(slot0[1]),
                observationIndex: Number.parseInt(slot0[2]),
                observationCardinality: Number.parseInt(slot0[3]),
                observationCardinalityNext: Number.parseInt(slot0[4]),
                feeProtocol: Number.parseInt(slot0[5]),
                unlocked: Boolean(slot0[6]),
            };
            return poolState;
        } catch(e) {
            logger.error(`getPoolState > ${e.message}`)
        }
    }

    public async getPoolInstance(poolAddress: string): Promise<UniV3Pool> {
        logger.info(`getPoolInstance > pool address: ${poolAddress}`);
        const immutableData = await gUniV3DB.syncUpPoolwithImmutableData(poolAddress, this.network)
        const poolInfo = await this.getPoolRawInfo(poolAddress)
        poolInfo.immutables = immutableData
        
        const chainId = Web3Factory.getInstance().getChainId(this.network);
        const token0 = await this.swissKnife.syncUpTokenDB(poolInfo.immutables.token0);
        const token1 = await this.swissKnife.syncUpTokenDB(poolInfo.immutables.token1);
        const TokenA = new Token(chainId, token0.address, token0.decimals, token0.symbol, token0.name);
        const TokenB = new Token(chainId, token1.address, token1.decimals, token1.symbol, token1.name);
        const pool = new UniV3Pool(
            TokenA,
            TokenB,
            immutableData.fee,
            poolInfo.state.sqrtPriceX96.toString(),
            poolInfo.state.liquidity.toString(),
            poolInfo.state.tick,
        )
        return pool;
    }
}

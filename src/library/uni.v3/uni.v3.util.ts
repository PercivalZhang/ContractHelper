import { NetworkType, Web3Factory } from '../web3.factory';
import { SwissKnife } from '../swiss.knife';
import { defaultAbiCoder } from '@ethersproject/abi';
import { getCreate2Address } from '@ethersproject/address';
import { keccak256 } from '@ethersproject/solidity';
import { LoggerFactory } from '../LoggerFactory';

import { ethers } from 'ethers';
import { Pool as UniV3Pool } from '@uniswap/v3-sdk';
import { Token } from '@uniswap/sdk-core';
import { abi as IUniswapV3PoolABI } from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import { abi as IUniswapV3PositionManager } from '@uniswap/v3-periphery/artifacts/contracts/interfaces/INonfungiblePositionManager.sol/INonfungiblePositionManager.json';

interface PoolImmutables {
    factory: string;
    token0: string;
    token1: string;
    fee: number;
    tickSpacing: number;
    maxLiquidityPerTick: ethers.BigNumber;
}

interface PoolState {
    liquidity: ethers.BigNumber;
    sqrtPriceX96: ethers.BigNumber;
    tick: number;
    observationIndex: number;
    observationCardinality: number;
    observationCardinalityNext: number;
    feeProtocol: number;
    unlocked: boolean;
}

const POOL_INIT_CODE_HASH = '0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54';

const logger = LoggerFactory.getInstance().getLogger('UniV3Util');

export class UniV3Util {
    private network: NetworkType;
    private swissKnife: SwissKnife;
    private static instance: UniV3Util;
    private provider: ethers.providers.JsonRpcProvider;

    private constructor(network: NetworkType) {
        this.swissKnife = new SwissKnife(network);
        this.network = network;
        this.provider = new ethers.providers.JsonRpcProvider(Web3Factory.getInstance().getRPCURI(network));
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

    public async getPoolImmutables(poolAddress: string): Promise<PoolImmutables> {
        const poolContract = new ethers.Contract(poolAddress, IUniswapV3PoolABI, this.provider);
        const factoryAddress = await poolContract.factory();
        logger.info(`pool factory: ${factoryAddress}`);

        const [factory, token0, token1, fee, tickSpacing, maxLiquidityPerTick] = await Promise.all([
            poolContract.factory(),
            poolContract.token0(),
            poolContract.token1(),
            poolContract.fee(),
            poolContract.tickSpacing(),
            poolContract.maxLiquidityPerTick(),
        ]);

        const immutables: PoolImmutables = {
            factory,
            token0,
            token1,
            fee,
            tickSpacing,
            maxLiquidityPerTick,
        };
        return immutables;
    }

    public async getPoolState(poolAddress: string): Promise<PoolState> {
        const poolContract = new ethers.Contract(poolAddress, IUniswapV3PoolABI, this.provider);
        const [liquidity, slot] = await Promise.all([poolContract.liquidity(), poolContract.slot0()]);
        
        const poolState: PoolState = {
            liquidity,
            sqrtPriceX96: slot[0],
            tick: slot[1],
            observationIndex: slot[2],
            observationCardinality: slot[3],
            observationCardinalityNext: slot[4],
            feeProtocol: slot[5],
            unlocked: slot[6],
        };

        return poolState;
    }

    public async getPoolInstance(poolAddress: string): Promise<UniV3Pool> {
        logger.info(`getPoolInstance > pool address: ${poolAddress}`);
        const [immutables, state] = await Promise.all([
            this.getPoolImmutables(poolAddress),
            this.getPoolState(poolAddress),
        ]);
        const chainId = Web3Factory.getInstance().getChainId(this.network);
        const token0 = await this.swissKnife.syncUpTokenDB(immutables.token0);
        const token1 = await this.swissKnife.syncUpTokenDB(immutables.token1);
        const TokenA = new Token(chainId, immutables.token0, token0.decimals, token0.symbol, token0.name);
        const TokenB = new Token(chainId, immutables.token1, token1.decimals, token1.symbol, token1.name);
        const pool = new UniV3Pool(
            TokenA,
            TokenB,
            immutables.fee,
            state.sqrtPriceX96.toString(),
            state.liquidity.toString(),
            state.tick,
        );
        return pool;
    }
}

import { ContractHelper } from '../library/contract.helper';
import { LoggerFactory } from '../library/LoggerFactory';
import { NetworkType, Web3Factory } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';
import { TickMath, SqrtPriceMath } from '@uniswap/v3-sdk';
import JSBI from 'jsbi';
import { ERC721Helper } from '../library/erc721.helper';

// uni-v3: https://github.com/Uniswap/v3-sdk/blob/main/src/entities/pool.ts
const POOL_INIT_CODE_HASH = '0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54';

const network = NetworkType.ETH_MAIN;

const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('main');

const Config = {
    factory: '0x1f98431c8ad98523631ae4a59f267346ea31f984',
    positionManager: {
        address: '0xc36442b4a4522e871399cd717abdd847ab11fe88', 
        //address: '0xc6f252c2cdd4087e30608a35c022ce490b58179b', 
        methods: {
            balanceOf: 'balanceOf',
            tokenOfOwnerByIndex: 'tokenOfOwnerByIndex',
            tokenURI: 'tokenURI',
            ownerOf: 'ownerOf',
        },
    },
};

import { defaultAbiCoder } from '@ethersproject/abi';
import { getCreate2Address } from '@ethersproject/address';
import { keccak256 } from '@ethersproject/solidity';
import BigNumber from 'bignumber.js';

interface Position {
    tickLower: number;
    tickUpper: number;
    liquidity: JSBI;
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
const computePoolAddress = (
    factoryAddress: string,
    token0: string,
    token1: string,
    fee: number,
    initCodeHashManualOverride?: string,
): string => {
    //const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA]; // does safety checks
    return getCreate2Address(
        factoryAddress,
        keccak256(['bytes'], [defaultAbiCoder.encode(['address', 'address', 'uint24'], [token0, token1, fee])]),
        initCodeHashManualOverride ?? POOL_INIT_CODE_HASH,
    );
};

const getTokensAmountOfPosition = async (poolAddress: string, position: Position) => {
    const pool = new ContractHelper(poolAddress, './Uniswap/v3/pool.json', network);
    const slot0 = await pool.callReadMethod('slot0');
    const tickCurrent = Number.parseInt(slot0.tick);
    const sqrtPriceX96 = JSBI.BigInt(slot0.sqrtPriceX96);

    const tickLower = position.tickLower;
    const tickUpper = position.tickUpper;
    const liquidity = position.liquidity;
    // calculate token 0 amount
    let token0Amount: JSBI;
    if (tickCurrent < tickLower) {
        token0Amount = SqrtPriceMath.getAmount0Delta(
            TickMath.getSqrtRatioAtTick(tickLower),
            TickMath.getSqrtRatioAtTick(tickUpper),
            liquidity,
            false,
        );
    } else if (tickCurrent < tickUpper) {
        token0Amount = SqrtPriceMath.getAmount0Delta(
            sqrtPriceX96,
            TickMath.getSqrtRatioAtTick(tickUpper),
            liquidity,
            false,
        );
    } else {
        token0Amount = JSBI.BigInt(0);
    }
    const token0Address = await pool.callReadMethod('token0');
    const token0 = await swissKnife.syncUpTokenDB(token0Address);
    const intToken0Amount = token0.readableAmount(String(token0Amount));
    logger.info(`token 0: ${intToken0Amount.toFixed(6)} ${token0.symbol}`);
    // calculate token 1 amount
    let token1Amount: JSBI;
    if (tickCurrent < tickLower) {
        token1Amount = JSBI.BigInt(0);
    } else if (tickCurrent < tickUpper) {
        token1Amount = SqrtPriceMath.getAmount1Delta(
            sqrtPriceX96,
            TickMath.getSqrtRatioAtTick(tickLower),
            liquidity,
            false,
        );
    } else {
        token1Amount = SqrtPriceMath.getAmount1Delta(
            TickMath.getSqrtRatioAtTick(tickLower),
            TickMath.getSqrtRatioAtTick(tickUpper),
            liquidity,
            false,
        );
    }
    const token1Address = await pool.callReadMethod('token1');
    const token1 = await swissKnife.syncUpTokenDB(token1Address);
    const intToken1Amount = token1.readableAmount(String(token1Amount));
    logger.info(`token 1: ${intToken1Amount.toFixed(6)} ${token1.symbol}`);
};

const positionHelper = new ERC721Helper(network, Config.positionManager, './Uniswap/v3/position.manager.json');
const callbackPosition = async (tokenId: number, helper: ContractHelper) => {
    const positionManager = new ContractHelper(
        Config.positionManager.address,
        './Uniswap/v3/position.manager.json',
        network,
    );
    // 获取position信息
    const position = await positionManager.callReadMethod('positions', tokenId);
    const tickLower = Number.parseInt(position.tickLower);
    const tickUpper = Number.parseInt(position.tickUpper);
    const liquidity = JSBI.BigInt(position.liquidity);
    
    const token0Address = position.token0;
    const token1Address = position.token1;
    
    const fee = Number.parseInt(position.fee);
    if (JSBI.GT(liquidity, 0)) {
        const token0 = await swissKnife.syncUpTokenDB(token0Address)
        const token1 = await swissKnife.syncUpTokenDB(token1Address)
        const poolAddress = computePoolAddress(Config.factory, token0Address, token1Address, fee);
        logger.info(`pool - ${token0.symbol}/${token1.symbol}: ${poolAddress}`);
        await getTokensAmountOfPosition(poolAddress, {tickLower, tickUpper, liquidity});
        
        const fees = await positionManager.callReadMethod('collect', [tokenId, '0x469bbafeb93480ee4c2cbff806bc504188335499', '9007199254740990000000', '9007199254740990000000'])
        logger.info(`[reward] token0: ${token0.readableAmount(fees.amount0).toFixed(6)} ${token0.symbol}`)
        logger.info(`[reward] token1: ${token1.readableAmount(fees.amount1).toFixed(6)} ${token1.symbol}`)
    }
};

const main = async () => {
    // user: 0x469bbafeb93480ee4c2cbff806bc504188335499
    // pool(GALA/WETH): https://etherscan.io/address/0xf8a95b2409c27678a6d18d950c5d913d5c38ab03#readContract
    // position/tokenId: 157606
    positionHelper.getMyNFTReceipts('0x469bbafeb93480ee4c2cbff806bc504188335499', callbackPosition);
};

main().catch((e) => {
    logger.error(e.message);
});

// subgraph： https://thegraph.com/hosted-service/subgraph/uniswap/uniswap-v3
// subgraph query: https://docs.uniswap.org/sdk/subgraph/subgraph-examples

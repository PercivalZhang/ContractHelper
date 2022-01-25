import { ContractHelper } from '../library/contract.helper';
import { LoggerFactory } from '../library/LoggerFactory';
import { NetworkType, Web3Factory } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';
import { TickMath, SqrtPriceMath } from '@uniswap/v3-sdk';
import JSBI from 'jsbi';
import { ERC721Helper } from '../library/erc721.helper';
import { ERC20Token } from '../library/erc20.token';
import { defaultAbiCoder } from '@ethersproject/abi';
import { getCreate2Address } from '@ethersproject/address';
import { keccak256 } from '@ethersproject/solidity';
import BigNumber from 'bignumber.js';

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

type Position = {
    id: number;
    tickLower: number;
    tickUpper: number;
    liquidity: string;
    token0: string;
    token1: string;
    fee: number;
    pool: string;
    token0Amount: string;
    token1Amount: string;
};
type PoolInfo = {
    address: string;
    token0: {
        token: ERC20Token;
        balance: string;
    };
    token1: {
        token: ERC20Token;
        balance: string;
    };
};
type Receipt = {
    pool: PoolInfo;
    positions: Position[];
};
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
const getPoolInfo = async (poolAddress: string): Promise<PoolInfo> => {
    const pool = new ContractHelper(poolAddress, './Uniswap/v3/pool.json', network);
    const token0Address = await pool.callReadMethod('token0');
    const token0 = await swissKnife.syncUpTokenDB(token0Address);
    const token0Contract = new ContractHelper(token0Address, './erc20.json', network);
    const token1Address = await pool.callReadMethod('token1');
    const token1 = await swissKnife.syncUpTokenDB(token1Address);
    const token1Contract = new ContractHelper(token1Address, './erc20.json', network);

    const token0Balance = await token0Contract.callReadMethod('balanceOf', poolAddress);
    const token1Balance = await token1Contract.callReadMethod('balanceOf', poolAddress);
    return {
        address: poolAddress,
        token0: {
            token: token0,
            balance: token0Balance,
        },
        token1: {
            token: token1,
            balance: token1Balance,
        },
    };
};
const calPositionTokenAmount = async (position: Position): Promise<Position> => {
    try {
        const pool = new ContractHelper(position.pool, './Uniswap/v3/pool.json', network);
        const token0Address = position.token0;
        const token0 = await swissKnife.syncUpTokenDB(token0Address);

        const token1Address = position.token0;
        const token1 = await swissKnife.syncUpTokenDB(token1Address);

        const slot0 = await pool.callReadMethod('slot0');
        const tickCurrent = Number.parseInt(slot0.tick);
        const sqrtPriceX96 = JSBI.BigInt(slot0.sqrtPriceX96);

        const tickLower = position.tickLower;
        const tickUpper = position.tickUpper;
        const liquidity = JSBI.BigInt(position.liquidity);

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

        const intToken0Amount = token0.readableAmount(String(token0Amount));
        logger.info(`token 0: ${intToken0Amount.toFixed(6)} ${token0.symbol}`);
        position.token0Amount = String(token0Amount);
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
        const intToken1Amount = token1.readableAmount(String(token1Amount));
        logger.info(`token 1: ${intToken1Amount.toFixed(6)} ${token1.symbol}`);
        position.token1Amount = String(token1Amount);
        return position;
    } catch (e) {
        logger.error(`calPositionTokenAmount > ${e.message}`);
    }
};

const positionHelper = new ERC721Helper(network, Config.positionManager, './Uniswap/v3/position.manager.json');
const callbackPosition = async (tokenId: number, helper: ContractHelper): Promise<Position> => {
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
    // ignore流动性为0的position
    if (JSBI.GT(liquidity, 0)) {
        const token0 = await swissKnife.syncUpTokenDB(token0Address);
        const token1 = await swissKnife.syncUpTokenDB(token1Address);
        const poolAddress = computePoolAddress(Config.factory, token0Address, token1Address, fee);
        logger.info(`callbackPosition > pool - ${token0.symbol}/${token1.symbol}: ${poolAddress}`);
        return {
            id: tokenId,
            pool: poolAddress,
            tickLower,
            tickUpper,
            liquidity: position.liquidity,
            token0Amount: '',
            token1Amount: '',
            token0: token0Address,
            token1: token1Address,
            fee: fee,
        };
        //const fees = await positionManager.callReadMethod('collect', [tokenId, '0x469bbafeb93480ee4c2cbff806bc504188335499', '9007199254740990000000', '9007199254740990000000'])
        //logger.info(`[reward] token0: ${token0.readableAmount(fees.amount0).toFixed(6)} ${token0.symbol}`)
        //logger.info(`[reward] token1: ${token1.readableAmount(fees.amount1).toFixed(6)} ${token1.symbol}`)
    }
};

const main = async () => {
    // user: 0x469bbafeb93480ee4c2cbff806bc504188335499
    // pool(GALA/WETH): https://etherscan.io/address/0xf8a95b2409c27678a6d18d950c5d913d5c38ab03#readContract
    // position/tokenId: 157606
    const receipt = await positionHelper.getMyNFTReceipts(
        '0xecaa8f3636270ee917c5b08d6324722c2c4951c7',
        callbackPosition,
    );
    // Map - 用户保存每个池子对应的用户Position列表
    const poolPostionMap: Map<string, Position[]> = new Map<string, Position[]>();
    if (receipt.customizedData.length > 0) {
        const positions: Position[] = receipt.customizedData;
        //遍历用户所有的position
        for (const position of positions) {
            //如果Map中没有池子pool信息，添加pool
            if (!poolPostionMap.has(position.pool)) {
                const poolInfo = await getPoolInfo(position.pool);
                console.log(poolInfo);
                poolPostionMap.set(position.pool, []);
            }
            //计算并补齐position中缺失的两种token的数量
            const pos = await calPositionTokenAmount(position);
            poolPostionMap.get(position.pool).push(pos);
        }
    }
    console.log(poolPostionMap);
};

main().catch((e) => {
    logger.error(e.message);
});

// subgraph： https://thegraph.com/hosted-service/subgraph/uniswap/uniswap-v3
// subgraph query: https://docs.uniswap.org/sdk/subgraph/subgraph-examples

import { ERC721Helper } from '../erc721.helper';
import { NetworkType } from '../web3.factory';
import { SwissKnife } from '../swiss.knife';
import JSBI from 'jsbi';
import { ERC20Token } from '../erc20.token';
import { defaultAbiCoder } from '@ethersproject/abi';
import { getCreate2Address } from '@ethersproject/address';
import { keccak256 } from '@ethersproject/solidity';
import { TickMath, SqrtPriceMath } from '@uniswap/v3-sdk';
import { LoggerFactory } from '../LoggerFactory';
import { ContractHelper } from '../contract.helper';
import { UniV3JSONDB } from './uni.v3.db';

export type UniV3NFTPosition = {
    id: number;
    tickLower: number;
    tickUpper: number;
    priceLower: number;
    priceUpper: number;
    liquidity: string;
    token0: {
        token: ERC20Token;
        amount: string;
    };
    token1: {
        token: ERC20Token;
        amount: string;
    };
    fee: number;
    pool: string;
};

export type Slot0Data = {
    sqrtPriceX96: string;
    tick: string;
};

const POOL_INIT_CODE_HASH = '0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54';

const logger = LoggerFactory.getInstance().getLogger('UniV3Helper');
const gNFTDB = UniV3JSONDB.getInstance();

const PositionManagerMetadata = {
    address: '',
    //address: '0xc6f252c2cdd4087e30608a35c022ce490b58179b',
    methods: {
        balanceOf: 'balanceOf',
        tokenOfOwnerByIndex: 'tokenOfOwnerByIndex',
        tokenURI: 'tokenURI',
        ownerOf: 'ownerOf',
    },
};

export class UniV3PM {
    private network: NetworkType;
    private positionNFTHelper: ERC721Helper;
    private positionManager: ContractHelper;
    private swissKnife: SwissKnife;
    private static instance: UniV3PM;
    private factoryAddress: string;

    private constructor(factoryAddress: string, positionManagerAddress: string, network: NetworkType) {
        PositionManagerMetadata.address = positionManagerAddress;
        this.positionNFTHelper = new ERC721Helper(
            network,
            PositionManagerMetadata,
            './Uniswap/v3/position.manager.json',
        );
        this.positionManager = new ContractHelper(
            positionManagerAddress,
            './Uniswap/v3/position.manager.json',
            network,
        );
        this.swissKnife = new SwissKnife(network);
        this.factoryAddress = factoryAddress;
        this.network = network;
    }

    static getInstance(factoryAddress: string, positionManagerAddress: string, network: NetworkType) {
        if (!UniV3PM.instance) {
            UniV3PM.instance = new UniV3PM(factoryAddress, positionManagerAddress, network);
        }
        return UniV3PM.instance;
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

    public async getUserNFTPositions(userAddress: string): Promise<UniV3NFTPosition[]> {
        logger.debug(`getUserNFTPositions > user address: ${userAddress}`);
        const receipt = await this.positionNFTHelper.getMyNFTReceipts(userAddress);
        const positions: UniV3NFTPosition[] = [];

        for (let i = 0; i < receipt.tokenIds.length; i++) {
            const pos = await this.getPositionById(receipt.tokenIds[i]);
            positions.push(pos);
        }

        return positions;
    }

    public async getPositionById(posId: number, ignoreTokenAmount = true): Promise<UniV3NFTPosition> {
        let pos = await gNFTDB.getPositionById(posId.toString());
        if (!pos) {
            // 获取position信息
            const position = await this.positionManager.callReadMethod('positions', posId);
            const tickLower = Number.parseInt(position.tickLower);
            const tickUpper = Number.parseInt(position.tickUpper);
            const token0Address = position.token0;
            const token1Address = position.token1;
            const fee = Number.parseInt(position.fee);
            // ignore流动性为0的position
            //if (JSBI.GT(liquidity, 0)) {
            const token0 = await this.swissKnife.syncUpTokenDB(token0Address);
            const token1 = await this.swissKnife.syncUpTokenDB(token1Address);
            const poolAddress = UniV3PM.computePoolAddress(this.factoryAddress, token0Address, token1Address, fee);
            logger.info(`getPositionById > pos id: ${posId}`);
            logger.info(`getPositionById > pool - ${token0.symbol}/${token1.symbol}: ${poolAddress}`);

            pos = {
                id: posId,
                pool: poolAddress,
                tickLower,
                tickUpper,
                priceLower: 0.0,
                priceUpper: 0.0,
                liquidity: position.liquidity,
                token0: {
                    token: token0,
                    amount: '0', // 取决于pool的tickCurrent
                },
                token1: {
                    token: token1,
                    amount: '0', // 取决于pool的tickCurrent
                },
                fee: fee,
            };
            //pos.priceLower = this.tick2PriceDecimal(pos.tickLower, token0.decimals, token1.decimals);
            //pos.priceUpper = this.tick2PriceDecimal(pos.tickUpper, token0.decimals, token1.decimals);
            /**
             * tokenId: position id/NFT tokenId
             * _user: user address
             * _amount0Max: 最大值9007199254740990000000
             * _amount1Max: 最大值9007199254740990000000
             */
            //const fees = await positionManager.callReadMethod('collect', [tokenId, '0x469bbafeb93480ee4c2cbff806bc504188335499', '9007199254740990000000', '9007199254740990000000'])
            //logger.info(`[reward] token0: ${token0.readableAmount(fees.amount0).toFixed(6)} ${token0.symbol}`)
            //logger.info(`[reward] token1: ${token1.readableAmount(fees.amount1).toFixed(6)} ${token1.symbol}`)
        //}
        }
        if (!ignoreTokenAmount) {
            //计算并补齐position中缺失的两种token的数量
            pos = await this.calPositionTokenAmount(pos);
        }
        await gNFTDB.syncUpPosition(pos);
        return pos;
    }
    /**
     * 计算tick对应的价格
     * @param tick - position tick(lower/upper)
     * @param tokenADecimals - base token(token0) decimals
     * @param tokenBDecimals - quote token(token1) decimals
     * @returns
     */
    private tick2PriceDecimal(tick: number, tokenADecimals: number, tokenBDecimals: number): number {
        return Math.pow(1.0001, tick) * (10 ** tokenADecimals / 10 ** tokenBDecimals);
    }
    public async calPositionTokenAmount(position: UniV3NFTPosition, slot0Data?: Slot0Data): Promise<UniV3NFTPosition> {
        try {
            logger.info(`calPositionTokenAmount > pos id: ${position.id}`);
            logger.info(`calPositionTokenAmount > pool: ${position.pool}`);
            const pool = new ContractHelper(position.pool, './Uniswap/v3/pool.json', this.network);
            const token0 = await this.swissKnife.syncUpTokenDB(position.token0.token.address);
            const token1 = await this.swissKnife.syncUpTokenDB(position.token1.token.address);
            const slot0 = slot0Data == null ? await pool.callReadMethod('slot0') : slot0Data;

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
            position.token0.amount = intToken0Amount.toFixed(6);
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
            position.token1.amount = String(intToken1Amount.toFixed(6));
            return position;
        } catch (e) {
            logger.error(`calPositionTokenAmount > ${e.message}`);
        }
    }
}

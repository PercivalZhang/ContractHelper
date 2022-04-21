import { ERC721Helper } from './erc721.helper';
import { NetworkType } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';
import JSBI from 'jsbi';
import { ERC20Token } from '../library/erc20.token';
import { defaultAbiCoder } from '@ethersproject/abi';
import { getCreate2Address } from '@ethersproject/address';
import { keccak256 } from '@ethersproject/solidity';
import { TickMath, SqrtPriceMath } from '@uniswap/v3-sdk';
import { LoggerFactory } from '../library/LoggerFactory';
import { ContractHelper } from '../library/contract.helper';

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

const POOL_INIT_CODE_HASH = '0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54';

const logger = LoggerFactory.getInstance().getLogger('main');

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

export class UniV3Helper {
    private positionNFTHelper: ERC721Helper;
    private positionManager: ContractHelper;
    private swissKnife: SwissKnife;
    private static instance: UniV3Helper;
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
    }

    static getInstance(factoryAddress: string, positionManagerAddress: string, network: NetworkType) {
        if (!UniV3Helper.instance) {
            UniV3Helper.instance = new UniV3Helper(factoryAddress, positionManagerAddress, network);
        }
        return UniV3Helper.instance;
    }

    public async getUserNFTReceipt(userAddress: string) {
        const receipt = await this.positionNFTHelper.getMyNFTReceipts(userAddress, this.callbackPosition);
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

    private async callbackPosition(tokenId: number, helper: ContractHelper): Promise<Position> {
        // 获取position信息
        const position = await this.positionManager.callReadMethod('positions', tokenId);
        const tickLower = Number.parseInt(position.tickLower);
        const tickUpper = Number.parseInt(position.tickUpper);
        const liquidity = JSBI.BigInt(position.liquidity);
        const token0Address = position.token0;
        const token1Address = position.token1;
        const fee = Number.parseInt(position.fee);
        // ignore流动性为0的position
        if (JSBI.GT(liquidity, 0)) {
            const token0 = await this.swissKnife.syncUpTokenDB(token0Address);
            const token1 = await this.swissKnife.syncUpTokenDB(token1Address);
            const poolAddress = UniV3Helper.computePoolAddress(this.factoryAddress, token0Address, token1Address, fee);
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
            /**
             * tokenId: position id/NFT tokenId
             * _user: user address
             * _amount0Max: 最大值9007199254740990000000
             * _amount1Max: 最大值9007199254740990000000
             */
            //const fees = await positionManager.callReadMethod('collect', [tokenId, '0x469bbafeb93480ee4c2cbff806bc504188335499', '9007199254740990000000', '9007199254740990000000'])
            //logger.info(`[reward] token0: ${token0.readableAmount(fees.amount0).toFixed(6)} ${token0.symbol}`)
            //logger.info(`[reward] token1: ${token1.readableAmount(fees.amount1).toFixed(6)} ${token1.symbol}`)
        }
    }
}

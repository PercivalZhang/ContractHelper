import { ContractHelper } from '../../library/contract.helper';
import { LoggerFactory } from '../../library/LoggerFactory';
import { NetworkType } from '../../library/web3.factory';
import { SwissKnife } from '../../library/swiss.knife';
import { MasterChefHelper } from '../../library/master.chef';
import { SyrupChefHelper } from '../../library/syrup.chef';
import BigNumber from 'bignumber.js';

const Config = {
    //LP挖矿
    farmChef: {
        address: '0xb0523f9f473812fb195ee49bc7d2ab9873a98044',
        methods: {
            poolLength: 'poolLength',
            userInfo: 'userInfo',
            poolInfo: 'poolInfo',
            pendingReward: 'pendingTokens',
            rewardToken: 'ptp',
            totalAllocPoint: 'totalAllocPoint',
        },
        pool: {
            lpToken: 'lpToken',
            allocPoint: 'allocPoint',
        },
    },
    // vault: {
    //     vvsVVSAuto: '0xa6ff77fc8e839679d4f7408e8988b564de1a2dcd', //vvs自动复投
    //     vvsBIFI: '0x1a888d7b2abfd2b5046d8461e6d1703f654a8fc0', //vvs->BIFI
    // },
    ptp: '0x22d4002028f537599be9f666d1c4fa138522f9c8',
    poolManager: '0x66357dcace80431aee0a7507e2e361b7e2402370',
};

const network = NetworkType.AVALANCHE;

const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('farm');

const poolManager = new ContractHelper(Config.poolManager, './Avalanche/platypus/pool.manager.json', network);

const getPoolDetails = async (tokenAddress: string) => {
    const underlyingToken = await swissKnife.syncUpTokenDB(tokenAddress);
    const priceOracleAddress = await poolManager.callReadMethod('getPriceOracle');
    logger.info(`price oracle address: ${priceOracleAddress}`);
    const priceOracle = new ContractHelper(priceOracleAddress, './Avalanche/platypus/price.oracle.json', network);

    const assetAddress = await poolManager.callReadMethod('assetOf', tokenAddress);
    const asset = new ContractHelper(assetAddress, './Avalanche/platypus/lp.token.json', network);
    const assetToken = await swissKnife.syncUpTokenDB(assetAddress);

    const poolTAG = `pool - ${underlyingToken.symbol}`;
    const assetPrice = await priceOracle.callReadMethod('getAssetPrice', tokenAddress);
    const offset = 10 ** (18 - assetToken.decimals);
    logger.info(
        `${poolTAG} > asset ${assetToken.symbol} price: ${new BigNumber(assetPrice)
            .dividedBy(1e8)
            .toNumber()
            .toFixed(4)} USD`,
    );

    const cash = await asset.callReadMethod('cash');
    logger.info(`${poolTAG} > cash: ${cash}`);

    const liability = await asset.callReadMethod('liability'); // pool total deposit
    logger.info(`${poolTAG} > liability: ${liability}`);
    logger.info(
        `${poolTAG} > total deposit: ${underlyingToken.readableAmount(liability).toFixed(4)} ${underlyingToken.symbol}`,
    );

    //const totalDepositUSD = new BigNumber(liability).multipliedBy(assetPrice).dividedBy(1e8);
    //logger.info(`${poolTAG} > total deposit: ${assetToken.readableAmountFromBN(totalDepositUSD).toFixed(6)} USD`);
    const coverageRatio = new BigNumber(cash).dividedBy(liability);
    logger.info(`${poolTAG} > coverage ratio: ${coverageRatio.multipliedBy(100).toNumber().toFixed(4)}%`);
};

const main = async () => {
    const underlyingTokenAddresses = await poolManager.callReadMethod('getTokenAddresses');
    for (const underlyingTokenAddress of underlyingTokenAddresses) {
        await getPoolDetails(underlyingTokenAddress);
    }
};

main().catch((e) => {
    logger.error(e.message);
});

import { ContractHelper } from '../library/contract.helper';
import { LoggerFactory } from '../library/LoggerFactory';
import { NetworkType } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';
import BigNumber from 'bignumber.js';
import { MasterChefHelper } from '../library/master.chef';

const network = NetworkType.POLYGON;

const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('main');

const Config = {
    farmChef: {
        address: '0x6275518a63e891b1bC54FEEBBb5333776E32fAbD',
        methods: {
            poolLength: 'poolLength',
            userInfo: 'userInfo',
            poolInfo: 'poolInfo',
            pendingReward: 'pendingReward',
            rewardToken: 'rewardToken',
        },
        pool: {
            lpToken: 'lpToken',
        },
    },
    vaults: [
        '0x992Ae1912CE6b608E0c0d2BF66259ab1aE62A657', // KOGECOIN
        '0xC2c5a92E4dA9052aF406c0b97f09378C51a7E767', // miMATIC-USDT LP
        '0x4a93d6b394da4c1e6e436e9370e5df08a45377a8', // curve USDC-USDT-DAI
    ],
};

const masterChef = new MasterChefHelper(network, Config.farmChef, './KogeFarm/master.chef.farm.json');

const getVaultReceipt = async (vaultAddress: string, userAddress: string) => {
    const vault = new ContractHelper(vaultAddress, './KogeFarm/vault.json', network);
    vault.toggleHiddenExceptionOutput();
    //获取金库实际资产token的地址
    const underlyingTokenAddress = await vault.callReadMethod('token');
    const underlyingToken = await swissKnife.syncUpTokenDB(underlyingTokenAddress);
    //获取存款凭证token与实际资产token的兑换比例
    const exchangeRate = await vault.callReadMethod('getRatio');
    //获取用户存款凭证token的数目
    const myShares = await vault.callReadMethod('balanceOf', userAddress);
    //计算用户实际资产token的数目
    const myUnderlyingTokens = new BigNumber(myShares)
        .multipliedBy(exchangeRate)
        .dividedBy(Math.pow(10, 18))
        .dividedBy(Math.pow(10, underlyingToken.decimals));
    //判断是否是uniswap风格的双币LP
    const isPariedLPT = await swissKnife.isLPToken(underlyingTokenAddress);
    if (isPariedLPT) {
        const lpt = await swissKnife.getLPTokenDetails(underlyingTokenAddress);
        logger.info(
            `my staked: ${myUnderlyingTokens.toNumber().toFixed(10)} ${lpt.token0.symbol}-${lpt.token1.symbol} LP`,
        );
    } else {
        logger.info(`my staked: ${myUnderlyingTokens.toNumber().toFixed(10)} ${underlyingToken.symbol}`);
    }
};

const main = async () => {
    await masterChef.getFarmingReceipts('0xD2050719eA37325BdB6c18a85F6c442221811FAC', Config.farmChef);
    console.log(`\n-------------------------------------------------------------------------\n`);
    for (const vaultAddress of Config.vaults) {
        await getVaultReceipt(vaultAddress, '0xD2050719eA37325BdB6c18a85F6c442221811FAC');
        console.log(`\n---------------------------------------------------------------------\n`);
    }
};

main().catch((e) => {
    logger.error(e.message);
});

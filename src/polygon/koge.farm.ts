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
    vaults: ['0x992Ae1912CE6b608E0c0d2BF66259ab1aE62A657', '0xC2c5a92E4dA9052aF406c0b97f09378C51a7E767'],
};

const masterChef = new MasterChefHelper(network, Config.farmChef, './KogeFarm/master.chef.farm.json');

const getVaultReceipt = async (vaultAddress: string, userAddress: string) => {
    const vault = new ContractHelper(vaultAddress, './KogeFarm/vault.json', network);
    vault.toggleHiddenExceptionOutput();

    const underlyingTokenAddress = await vault.callReadMethod('token');
    const underlyingToken = await swissKnife.syncUpTokenDB(underlyingTokenAddress);

    const exchangeRate = await vault.callReadMethod('getRatio');
    const myShares = await vault.callReadMethod('balanceOf', userAddress);

    const myUnderlyingTokens = new BigNumber(myShares)
        .multipliedBy(exchangeRate)
        .dividedBy(Math.pow(10, 18))
        .dividedBy(Math.pow(10, underlyingToken.decimals));
    logger.info(`my staked: ${myUnderlyingTokens.toNumber().toFixed(10)} ${underlyingToken.symbol}`);
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

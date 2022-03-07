import { ContractHelper } from '../library/contract.helper';
import { LoggerFactory } from '../library/LoggerFactory';
import { NetworkType } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';
import { MasterChefHelper } from '../library/master.chef';
import BigNumber from 'bignumber.js';

const network = NetworkType.CRONOS;

const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('main');
//UniswapV2 Factory：0x3b44b2a187a7b3824131f8db5a74194d0a42fc15
const Config = {
    //LP挖矿
    farmChef: {
        address: '0xDccd6455AE04b03d785F12196B492b18129564bc',
        methods: {
            poolLength: 'poolLength',
            userInfo: 'userInfo',
            poolInfo: 'poolInfo',
            pendingReward: 'pendingVVS',
            rewardToken: 'vvs',
            totalAllocPoint: 'totalAllocPoint',
        },
        pool: {
            lpToken: 'lpToken',
            allocPoint: 'allocPoint',
        },
    },
    vault: {
        vvsVVSAuto: '0xa6ff77fc8e839679d4f7408e8988b564de1a2dcd', //vvs自动复投
        vvsBIFI: '0x1a888d7b2abfd2b5046d8461e6d1703f654a8fc0', //vvs->BIFI
    },
    vvs: '0x2D03bECE6747ADC00E1a131BBA1469C15fD11e03',
};

const getOtherVaultReceipt = async (vaultAddress: string, userAddress: string) => {
    const vault = new ContractHelper(vaultAddress, './Cronos/vvs.finance/vault.json', network);
    vault.toggleHiddenExceptionOutput();

    const stakedTokenAddress = await vault.callReadMethod('stakedToken');
    const rewardTokenAddress = await vault.callReadMethod('rewardToken');

    const stakedToken = await swissKnife.syncUpTokenDB(stakedTokenAddress);
    const rewardToken = await swissKnife.syncUpTokenDB(rewardTokenAddress);
    logger.info(`vault staked token - ${stakedToken.symbol}: ${stakedToken.address}`);
    logger.info(`vault reward token - ${rewardToken.symbol}: ${rewardToken.address}`);

    const userInfo = await vault.callReadMethod('userInfo', userAddress);
    const myStakedTokenBalance = stakedToken.readableAmount(userInfo['amount']);
    logger.info(
        `vault[${stakedToken.symbol}/${rewardToken.symbol}] > my staked token: ${myStakedTokenBalance} ${stakedToken.symbol}`,
    );

    const pendingRewards = await vault.callReadMethod('pendingReward', userAddress);
    const myPendingRewards = rewardToken.readableAmount(pendingRewards);
    logger.info(
        `vault[${stakedToken.symbol}/${rewardToken.symbol}] > my pending rewards: ${myPendingRewards} ${rewardToken.symbol}`,
    );
};

const getAutoVaultReceipt = async (vaultAddress: string, userAddress: string) => {
    const vault = new ContractHelper(vaultAddress, './Cronos/vvs.finance/vault.auto.json', network);
    vault.toggleHiddenExceptionOutput();

    const vvs = await swissKnife.syncUpTokenDB(Config.vvs);

    const totalShares = await vault.callReadMethod('totalShares');
    logger.info(`vault[${vvs.symbol}/${vvs.symbol}] auto > total shares: ${totalShares}`);

    const userInfo = await vault.callReadMethod('userInfo', userAddress);
    const myShares = userInfo['0'];
    logger.info(`vault[${vvs.symbol}/${vvs.symbol}] auto > my shares: ${totalShares}`);

    const myRatio = new BigNumber(userInfo['0']).dividedBy(totalShares);
    logger.info(`my ratio: ${myRatio.toNumber().toFixed(6)}`);

    const pricePerFullShare = await vault.callReadMethod('getPricePerFullShare');
    const myStakedVVS = vvs.readableAmountFromBN(
        new BigNumber(pricePerFullShare).multipliedBy(myShares).dividedBy(Math.pow(10, 18)),
    );
    // const myStakedTokenBalance = stakedToken.readableAmount(userInfo['amount']);
    logger.info(`vault[${vvs.symbol}/${vvs.symbol}] auto > my staked token: ${myStakedVVS} ${vvs.symbol}`);
};

const masterChef = new MasterChefHelper(network, Config.farmChef, './chain.cronos/vvs.finance/craftsman.json');

const main = async () => {
    // pid - 47对应界面中的Staking > GINSPIRIT/SPIRIT LP
    //await masterChef.getFarmingReceipts('0x4d03C8Bd0A54D73eA1c4CEfcAF934121C4b13a7A');
    //await getOtherVaultReceipt(Config.vault.vvsBIFI, '0x4d03C8Bd0A54D73eA1c4CEfcAF934121C4b13a7A');
    await getAutoVaultReceipt(Config.vault.vvsVVSAuto, '0x9328e317db9ebb3c6bd9fb3622360f43191050d2');

    //await getInSpiritReceipt('0x228f23A962D1ACabB1775E31FAF7D1B5bfa85B5E');
};

main().catch((e) => {
    logger.error(e.message);
});

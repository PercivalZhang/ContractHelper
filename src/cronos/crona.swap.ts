import { ContractHelper } from '../library/contract.helper';
import { LoggerFactory } from '../library/LoggerFactory';
import { NetworkType } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';
import { MasterChefHelper } from '../library/master.chef';
import BigNumber from 'bignumber.js';

const network = NetworkType.CRONOS;

const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('main');
//UniswapV2 Factory:  0x73A48f8f521EB31c55c0e1274dB0898dE599Cb11
const Config = {
    //LP挖矿
    farmChef: {
        address: '0x77ea4a4cF9F77A034E4291E8f457Af7772c2B254',
        methods: {
            poolLength: 'poolLength',
            userInfo: 'userInfo',
            poolInfo: 'poolInfo',
            pendingReward: 'pendingCrona',
            rewardToken: 'crona',
            totalAllocPoint: 'totalAllocPoint',
        },
        pool: {
            lpToken: 'lpToken',
            allocPoint: 'allocPoint',
        },
    },
    vault: {
        cronaAuto: '0xDf3EBc46F283eF9bdD149Bb24c9b201a70d59389', //crona自动复投
        cronaCaddy: '0x507Ee4C2dA5fdc12Fa7DDDb66a338230D5ED1f41', //crona->Caddy
    },
    crona: '0xadbd1231fb360047525BEdF962581F3eee7b49fe',
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

/**
 * 获取自动复投单币质押金库的用户资产详情
 *
 * 质押平台币 - crona，自动复投收益
 * @param vaultAddress 金库合约地址
 * @param userAddress  目标用户地址
 */
const getAutoVaultReceipt = async (vaultAddress: string, userAddress: string) => {
    const vault = new ContractHelper(vaultAddress, './chain.cronos/crona.swap/vault.auto.json', network);
    vault.toggleHiddenExceptionOutput();

    const pToken = await swissKnife.syncUpTokenDB(Config.crona);

    const totalShares = await vault.callReadMethod('totalShares');
    logger.info(`vault[${pToken.symbol}/${pToken.symbol}] auto > total shares: ${totalShares}`);

    const userInfo = await vault.callReadMethod('userInfo', userAddress);
    const myShares = userInfo['0'];
    logger.info(`vault[${pToken.symbol}/${pToken.symbol}] auto > my shares: ${totalShares}`);

    const myRatio = new BigNumber(userInfo['0']).dividedBy(totalShares);
    logger.info(`vault[${pToken.symbol}/${pToken.symbol}] auto > my ratio: ${myRatio.toNumber().toFixed(6)}`);

    const pricePerFullShare = await vault.callReadMethod('getPricePerFullShare');
    const myStakedPTokens = pToken.readableAmountFromBN(
        new BigNumber(pricePerFullShare).multipliedBy(myShares).dividedBy(Math.pow(10, 18)),
    );
    logger.info(`vault[${pToken.symbol}/${pToken.symbol}] auto > my staked token: ${myStakedPTokens} ${pToken.symbol}`);
};

const masterChef = new MasterChefHelper(network, Config.farmChef, './chain.cronos/crona.swap/master.chef.json');

const main = async () => {
    // pid - 47对应界面中的Staking > GINSPIRIT/SPIRIT LP
    // await masterChef.getFarmingReceipts('0x9328e317db9ebb3c6bd9fb3622360f43191050d2');
    await getOtherVaultReceipt(Config.vault.cronaCaddy, '0x7c3d5E683Af445756FA74bD970c5b9be47E1461E');
    // await getAutoVaultReceipt(Config.vault.cronaAuto, '0x9328e317db9ebb3c6bd9fb3622360f43191050d2');
};

main().catch((e) => {
    logger.error(e.message);
});

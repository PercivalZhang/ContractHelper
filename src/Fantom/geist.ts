import { ContractHelper } from '../library/contract.helper';
import { LoggerFactory } from '../library/LoggerFactory';
import { NetworkType } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';
import { MasterChefHelper } from '../library/master.chef';
import { SyrupChefHelper } from '../library/syrup.chef';
import BigNumber from 'bignumber.js';
import { userInfo } from 'os';

const network = NetworkType.FANTOM;

const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('main');

const Config = {
    lendPool: '0x9fad24f572045c7869117160a571b2e50b10d068',
    geistStaking: '0x49c93a95dbcc9a6a4d8f77e59c038ce5020e82f8',
    //LP挖矿
    farmChef: {
        address: '0xe40b7fa6f5f7fb0dc7d56f433814227aaae020b5',
        methods: {
            poolLength: 'poolLength',
            userInfo: 'userInfo',
            poolInfo: 'poolInfo',
            pendingReward: 'pendingSpirit',
            rewardToken: 'spirit',
        },
        pools: [
            '0x668ae94d0870230ac007a01b471d02b2c94ddcb9'
        ],
    },
};
const getMasterChefReceipt = async (userAddress: string) => {
    const masterChef = new ContractHelper(Config.farmChef.address, './Fantom/Geist/master.chef.json', network);
    for (const lptAddress of Config.farmChef.pools) {
        const userInfo = await masterChef.callReadMethod('userInfo', lptAddress, userAddress);
        const myStakedBalance = new BigNumber(userInfo[0]);
        const isPairedLPToken = await swissKnife.isLPToken(lptAddress);
        //质押token是UNI paired lp token
        if (isPairedLPToken) {
            logger.info(`detected paired LP Token - ${lptAddress}`);
            const lpTokenDetails = await swissKnife.getLPTokenDetails(lptAddress);
            const token0 = lpTokenDetails.token0;
            const token1 = lpTokenDetails.token1;
            const lpt = new ContractHelper(lptAddress, './pair.json', network);
            const totalStakedLPT = await lpt.callReadMethod('balanceOf', Config.farmChef.address);
            const myRatio = myStakedBalance.dividedBy(totalStakedLPT);
            const myToken0 = token0.readableAmountFromBN(lpTokenDetails.reserve0.multipliedBy(myRatio));
            const myToken1 = token1.readableAmountFromBN(lpTokenDetails.reserve1.multipliedBy(myRatio));
            logger.info(
                `pool[${lptAddress}] > my staked LP Token: ${myStakedBalance
                    .dividedBy(Math.pow(10, 18))
                    .toNumber()
                    .toFixed(10)} ${token0.symbol}/${token1.symbol} LP Token`,
            );
            logger.info(`pool[${lptAddress}] > my staked token0: ${myToken0} ${token0.symbol}`);
            logger.info(`pool[${lptAddress}] > my staked token1: ${myToken1} ${token1.symbol}`);
        } else {
            //质押token是单币erc20质押
            const erc20Token = await swissKnife.syncUpTokenDB(lptAddress);
            logger.info(
                `pool[${lptAddress}] > my staked token: ${myStakedBalance
                    .dividedBy(Math.pow(10, erc20Token.decimals))
                    .toNumber()
                    .toFixed(10)} ${erc20Token.symbol}`,
            );
        }
    }
}
const getGeistStakingReceipt = async (userAddress: string) => {
    const stakingPool = new ContractHelper(Config.geistStaking, './Fantom/Geist/geist.staking.json', network);
    const stakingTokenAddress = await stakingPool.callReadMethod('stakingToken');
    const stakingToken = await swissKnife.syncUpTokenDB(stakingTokenAddress);
    logger.info(`staking token - ${stakingToken.symbol}: ${stakingToken.address}`);
    // 获取普通质押的token数量
    const unlockedBalance = new BigNumber(await stakingPool.callReadMethod('unlockedBalance', userAddress));
    if (unlockedBalance.gt(0)) {
        logger.info(
            `staking > unlocked > balance: ${stakingToken.readableAmountFromBN(unlockedBalance).toFixed(6)} ${
                stakingToken.symbol
            }`,
        );
    }
    // 获取锁定三个月的token数量信息
    const lockedBalanceData = await stakingPool.callReadMethod('lockedBalances', userAddress);
    /**
     * [ lockedBalances method Response ]
     * total   uint256 :  500000000000000000
     * unlockable   uint256 :  0
     * locked   uint256 :  500000000000000000
     * lockData   tuple[] :  500000000000000000,1648684800
     */
    const unlockableBalance = new BigNumber(lockedBalanceData[1]);  // 已经可以解锁的数量
    const lockedBalance = new BigNumber(lockedBalanceData[2]);      // 依然锁定的数量
    const unlockDatetime = lockedBalanceData[3][0][1];              // 解锁时间，单位毫秒
    if (unlockableBalance.gt(0) || lockedBalance.gt(0)) {
        logger.info(
            `staking > locked > unlockable balance: ${stakingToken
                .readableAmountFromBN(unlockableBalance)
                .toFixed(6)} ${stakingToken.symbol}`,
        );
        logger.info(
            `staking > locked > locked balance: ${stakingToken
                .readableAmountFromBN(lockedBalance)
                .toFixed(6)} ${stakingToken.symbol}`,
        );
        const endingTimestamp = new BigNumber(unlockDatetime);
        const endingDatetime = new Date(endingTimestamp.multipliedBy(1000).toNumber());
        logger.info(`staking > locked > unlockable by ${endingDatetime.toLocaleDateString()}`);
        // 获取可领取的多个token的奖励        
        const rewardDataItems = await stakingPool.callReadMethod('claimableRewards', userAddress);
        for(const rewardDataItem of rewardDataItems) {
            const rewardTokenAddress = rewardDataItem.token;
            const rewardToken = await swissKnife.syncUpTokenDB(rewardTokenAddress);
            const rewardBalance = rewardToken.readableAmount(rewardDataItem.amount);
            if(Number.parseFloat(rewardBalance.toFixed(6)) > 0) {
                logger.info(`staking > claimable reward - ${rewardToken.symbol}: ${rewardBalance.toFixed(6)}`);
            }
        }
    }
};
const getLendBorrowReceipt = async (userAddress: string) => {
    const lendPool = new ContractHelper(Config.lendPool, './Fantom/Geist/lend.pool.json', network);
    const reserves = await lendPool.callReadMethod('getReservesList');
    logger.info(`Geist > total ${reserves.length} assets`);
    for (const reserveTokenAddress of reserves) {
        const reserveToken = await swissKnife.syncUpTokenDB(reserveTokenAddress);
        const reserveData = await lendPool.callReadMethod('getReserveData', reserveToken.address);
        const gTokenAddress = reserveData['7'];
        const gToken = new ContractHelper(gTokenAddress, './Fantom/Geist/gToken.json', network);
        const myGTokenBalance = new BigNumber(await gToken.callReadMethod('balanceOf', userAddress));
        if (myGTokenBalance.gt(0)) {
            logger.info(
                `Geist > my collateral asset balance: ${reserveToken
                    .readableAmountFromBN(myGTokenBalance)
                    .toFixed(6)} ${reserveToken.symbol}`,
            );
            const sDebtTokenAddress = reserveData['8'];
            const sDebtTokenHelper = new ContractHelper(
                sDebtTokenAddress,
                './Fantom/Geist/stable.debt.token.json',
                network,
            );
            const mySDebtBalance = new BigNumber(await sDebtTokenHelper.callReadMethod('balanceOf', userAddress));
            if (mySDebtBalance.gt(0)) {
                const underlyingAssetTokenAddress = await sDebtTokenHelper.callReadMethod('UNDERLYING_ASSET_ADDRESS');
                const underlyingAssetToken = await swissKnife.syncUpTokenDB(underlyingAssetTokenAddress);
                logger.info(
                    `Geist > my borrowed token balance: ${underlyingAssetToken
                        .readableAmountFromBN(mySDebtBalance)
                        .toFixed(6)} ${underlyingAssetToken.symbol}`,
                );
            }
            const vDebtTokenAddress = reserveData['9'];
            const vDebtTokenHelper = new ContractHelper(
                vDebtTokenAddress,
                './Fantom/Geist/variable.debt.token.json',
                network,
            );
            const myVDebtBalance = new BigNumber(await vDebtTokenHelper.callReadMethod('balanceOf', userAddress));
            if (myVDebtBalance.gt(0)) {
                const underlyingAssetTokenAddress = await vDebtTokenHelper.callReadMethod('UNDERLYING_ASSET_ADDRESS');
                const underlyingAssetToken = await swissKnife.syncUpTokenDB(underlyingAssetTokenAddress);
                logger.info(
                    `Geist > my borrowed token balance: ${underlyingAssetToken
                        .readableAmountFromBN(myVDebtBalance)
                        .toFixed(6)} ${underlyingAssetToken.symbol}`,
                );
            }
        }
    }
};
const main = async () => {
    // await masterChef.getFarmingReceipts('0x881897b1FC551240bA6e2CAbC7E59034Af58428a');
    // await getMasonryReceipt('0x881897b1FC551240bA6e2CAbC7E59034Af58428a');
    // await getLendBorrowReceipt('0x881897b1FC551240bA6e2CAbC7E59034Af58428a');
    // await getGeistStakingReceipt('0x881897b1FC551240bA6e2CAbC7E59034Af58428a');
    await getMasterChefReceipt('0x881897b1FC551240bA6e2CAbC7E59034Af58428a');
};

main().catch((e) => {
    logger.error(e.message);
});

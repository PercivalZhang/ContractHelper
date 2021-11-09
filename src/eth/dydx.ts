import { ContractHelper } from '../library/contract.helper';
import { LoggerFactory } from '../library/LoggerFactory';
import { NetworkType } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';
import { MasterChefHelper } from '../library/master.chef';
import BigNumber from 'bignumber.js';

const network = NetworkType.ETH_MAIN;

const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('main');

const Config = {
    staking: {
        USDC: '0x5aa653a076c1dbb47cec8c1b4d152444cad91941',
    },
};

const getStakingReceipt = async (stakingPoolAddress: string, userAddress: string) => {
    const stakingPool = new ContractHelper(stakingPoolAddress, './DYDX/staking.json', network);
    stakingPool.toggleHiddenExceptionOutput();

    const stakedTokenAddress = await stakingPool.callReadMethod('STAKED_TOKEN');
    const stakedToken = await swissKnife.syncUpTokenDB(stakedTokenAddress);

    const myStakingBalance = new BigNumber(await stakingPool.callReadMethod('balanceOf', userAddress));
    logger.info(
        `my staking balance: ${myStakingBalance.dividedBy(Math.pow(10, stakedToken.decimals)).toNumber().toFixed(6)} ${
            stakedToken.symbol
        }`,
    );

    const rewardTokenAddress = await stakingPool.callReadMethod('REWARDS_TOKEN');
    const rewardToken = await swissKnife.syncUpTokenDB(rewardTokenAddress);
    //Call this function with eth_call to query the claimable rewards balance.
    const pendingRewardBalance = new BigNumber(
        await stakingPool.callReadMethodWithFrom('claimRewards', userAddress, userAddress),
    );
    logger.info(
        `my pending reward balance: ${pendingRewardBalance
            .dividedBy(Math.pow(10, rewardToken.decimals))
            .toNumber()
            .toFixed(6)} ${rewardToken.symbol}`,
    );
};

const main = async () => {
    await getStakingReceipt(Config.staking.USDC, '0x3ddfa8ec3052539b6c9549f12cea2c295cff5296');
    //await tokenRegistry();
};

main().catch((e) => {
    logger.error(e.message);
});

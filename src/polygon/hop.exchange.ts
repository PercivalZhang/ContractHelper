import { ContractHelper } from '../library/contract.helper';
import { LoggerFactory } from '../library/LoggerFactory';
import { NetworkType } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';
import BigNumber from 'bignumber.js';

const network = NetworkType.POLYGON;

const swissKnife = new SwissKnife(network);

const logger = LoggerFactory.getInstance().getLogger('main');
/**
 *
 */
const Config = {
    swap: {
        usdc: '0x5c32143c8b198f392d01f8446b754c181224ac26',
    },
    vault: {
        usdc: '0x2c2ab81cf235e86374468b387e241df22459a265',
    },
};
const getSwapTokens = async (swapAddress: string, userAddress: string, lptBalance: BigNumber) => {
    const swap = new ContractHelper(swapAddress, './HopExchange/swap.json', network);
    const token0Address = await swap.callReadMethod('getToken', 0);
    const token0 = await swissKnife.syncUpTokenDB(token0Address);
    const token1Address = await swap.callReadMethod('getToken', 1);
    const token1 = await swissKnife.syncUpTokenDB(token1Address);

    const myTokenBalances = await swap.callReadMethod('calculateRemoveLiquidity', userAddress, lptBalance);
    console.log(myTokenBalances);

    const myToken0Balance = new BigNumber(myTokenBalances[0]).dividedBy(Math.pow(10, token0.decimals));
    const myToken1Balance = new BigNumber(myTokenBalances[1]).dividedBy(Math.pow(10, token1.decimals));
    logger.info(`${token0.symbol} : ${myToken0Balance.toNumber().toFixed(6)}`);
    logger.info(`${token1.symbol} : ${myToken1Balance.toNumber().toFixed(6)}`);
};

const getVaultReceipt = async (vaultAddress: string, userAddress: string) => {
    logger.info(`vault: ${vaultAddress}`);
    const vault = new ContractHelper(vaultAddress, './HopExchange/vault.json', network);
    vault.toggleHiddenExceptionOutput();

    const rewardTokenAddress = await vault.callReadMethod('rewardsToken');
    const rewardToken = await swissKnife.syncUpTokenDB(rewardTokenAddress);
    logger.info(`reward token - ${rewardToken.symbol}: ${rewardTokenAddress}`);

    const stakingTokenAddress = await vault.callReadMethod('stakingToken');
    const stakingToken = await swissKnife.syncUpTokenDB(stakingTokenAddress);
    logger.info(`staking token - ${stakingToken.symbol}: ${stakingTokenAddress}`);

    const hLPToken = new ContractHelper(stakingTokenAddress, './HopExchange/lpt.json', network);
    const swapAddress = await hLPToken.callReadMethod('swap');

    const myStakedLPTBalance = new BigNumber(await vault.callReadMethod('balanceOf', userAddress));
    logger.info(
        `my staked hop lp token balance: ${myStakedLPTBalance
            .div(Math.pow(10, stakingToken.decimals))
            .toNumber()
            .toFixed(8)} ${stakingToken.symbol}`,
    );
    // get two tokens' balance if user remove lpt from pool
    await getSwapTokens(swapAddress, userAddress, myStakedLPTBalance);
    // reward has been ended
    const pendingRewards = new BigNumber(await vault.callReadMethod('earned', userAddress));
    logger.info(
        `my pending reward token balance: ${pendingRewards
            .div(Math.pow(10, rewardToken.decimals))
            .toNumber()
            .toFixed(8)} ${rewardToken.symbol}`,
    );
};

const main = async () => {
    // tester address: 0x4d3c30b365dccecceaa3ba367494ff7f7b7a0222   // lp asset
    await getVaultReceipt(Config.vault.usdc, '0xD2050719eA37325BdB6c18a85F6c442221811FAC');
};

main().catch((e) => {
    logger.error(e.message);
});

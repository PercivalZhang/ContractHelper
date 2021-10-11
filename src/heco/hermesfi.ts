import { ContractHelper } from '../library/contract.helper';
import { LoggerFactory } from '../library/LoggerFactory';
import { NetworkType } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';
import BigNumber from 'bignumber.js';

const network = NetworkType.HECO;

const swissKnife = new SwissKnife(network);

const logger = LoggerFactory.getInstance().getLogger('main');

const Config = {
    addresses: {
        HBTC: '0x3c961d505b3506ee33dc214148f3fb1860a0d943',
        WHT: '0x7b7c14df11ba43963f51a610a383e4ad7de2671c',
        MDEX: '0x6e73cc60cc227f2c019c79d0459411ef2c188a25',
        WHT_USDT: '0x799c2da6c0a9842e2be82d5cc1f6b06bfece4d4d'
    },
};

const ADDY = '0xc3FdbadC7c795EF1D6Ba111e06fF8F16A20Ea539';

/**
 * 获取单币挖矿的信息
 * @param userAddress
 * Contract： 0x920f22e1e5da04504b765f8110ab96a20e6408bd
 */
const getSingleDepositReceipt = async (vaultAddress: string, userAddress: string) => {
    const vault = new ContractHelper(
        vaultAddress,
        './Hermesfi/vault.json',
        network,
    );
    vault.toggleHiddenExceptionOutput();
    //存款凭证token
    const hToken = await swissKnife.syncUpTokenDB(vaultAddress);
    //存款underlying token，同时也是rewardToken   
    const underlying = await vault.callReadMethod('underlying');
    const underlyingToken = await swissKnife.syncUpTokenDB(underlying);
    const rewardToken = underlyingToken;

    // //获取质押token的地址
    // const stakingTokenAddress = await vault.callReadMethod('stakingToken');
    // const stakingToken = await swissKnife.syncUpTokenDB(stakingTokenAddress);
    // logger.info(`staking token - ${stakingToken.symbol} : ${stakingToken.address}`);
    // //获取奖励token A的地址
    // const rewardTokenAAddress = await vault.callReadMethod('rewardTokens', 0);
    // const rewardTokenA = await swissKnife.syncUpTokenDB(rewardTokenAAddress);
    // //获取奖励token B的地址
    // const rewardTokenBAddress = await vault.callReadMethod('rewardTokens', 1);
    // const rewardTokenB = await swissKnife.syncUpTokenDB(rewardTokenBAddress);
    // //获取奖励token C的地址
    // const rewardTokenCAddress = await vault.callReadMethod('rewardTokens', 2);
    // const rewardTokenC = await swissKnife.syncUpTokenDB(rewardTokenBAddress);
    // //获取奖励token D的地址
    // const rewardTokenDAddress = await vault.callReadMethod('rewardTokens', 3);
    // const rewardTokenD = await swissKnife.syncUpTokenDB(rewardTokenBAddress);

    // //获取总质押token - ADDY的数量
    // const totalStakedBalance = new BigNumber(await vault.callReadMethod('totalSupply'));
    // logger.info(
    //     `total staked - ${totalStakedBalance.dividedBy(Math.pow(10, stakingToken.decimals)).toNumber().toFixed(6)} ${
    //         stakingToken.symbol
    //     }`,
    // );

    //获取目标用户存款凭证hToken的数量
    const myhTokenBalance = new BigNumber(await vault.callReadMethod('balanceOf', userAddress));
    logger.info(
        `my hToken balance: ${myhTokenBalance.dividedBy(Math.pow(10, hToken.decimals)).toNumber().toFixed(6)} ${
            hToken.symbol
        }`,
    );
    //获取目标用户存入的underlying Token的数量
    const myDepositUnderlyingBalance = new BigNumber(await vault.callReadMethod('depositBalance', userAddress));
    logger.info(
        `my deposited underlying token balance: ${myDepositUnderlyingBalance.dividedBy(Math.pow(10, underlyingToken.decimals)).toNumber().toFixed(6)} ${
            underlyingToken.symbol
        }`,
    );
    //获取目标用户当前账户总的underlying Token的数量（deposit + mining reward）
    const myTotalUnderlyingBalance = new BigNumber(await vault.callReadMethod('underlyingBalanceForHolder', userAddress));
    logger.info(
        `my total underlying token balance: ${myTotalUnderlyingBalance.dividedBy(Math.pow(10, underlyingToken.decimals)).toNumber().toFixed(6)} ${
            underlyingToken.symbol
        }`,
    );
    //获取目标用户可领取的奖励underlying token的数量(当前可兑换的数量 - 用户存入的数量)
    const pendingReward = new BigNumber(await vault.callReadMethod('pendingRewardForHolder', userAddress));
    logger.info(
        `pending reward - ${pendingReward.dividedBy(Math.pow(10, rewardToken.decimals)).toNumber().toFixed(6)} ${
            rewardToken.symbol
        }`,
    );
    
};

const main = async () => {
    await getSingleDepositReceipt(Config.addresses.HBTC, '0x53c218ee4b05f817fab41afd2c66fd92550a8888');
    logger.info(`-------------------------------------`);
    await getSingleDepositReceipt(Config.addresses.MDEX, '0xa9081a9f5ce12aa3bc670b667f44e0ae009e66b9');
};

main().catch((e) => {
    logger.error(e.message);
});
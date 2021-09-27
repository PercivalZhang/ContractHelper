import { ContractHelper } from '../library/contract.helper';
import { LoggerFactory } from '../library/LoggerFactory';
import { NetworkType } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';
import BigNumber from 'bignumber.js';

const network = NetworkType.POLYGON;

const swissKnife = new SwissKnife(network);

const logger = LoggerFactory.getInstance().getLogger('main');

const Config = {
    address: {
        bank: '0xa16abac16965d249c813b56bf8f923be69e4e66f',
        masterChef: '0x9762fe3ef5502df432de41e7765b0ccc90e02e92',
    },
};

const SING = '0xCB898b0eFb084Df14dd8E018dA37B4d0f06aB26D';

/**
 * 获取Bank存款的信息
 * @param userAddress
 * Contract： 0x920f22e1e5da04504b765f8110ab96a20e6408bd
 */
const getBankReceipt = async (userAddress: string) => {
    const vault = new ContractHelper(Config.address.bank, './Singular/bank.json', network);
    vault.toggleHiddenExceptionOutput();

    //获取质押token的地址
    const stakingTokenAddress = await vault.callReadMethod('lpToken');
    const stakingToken = await swissKnife.syncUpTokenDB(stakingTokenAddress);
    logger.info(`staking token - ${stakingToken.symbol} : ${stakingToken.address}`);

    //获取奖励token A的地址
    const rewardTokenAAddress = await vault.callReadMethod('USDC');
    const rewardToken = await swissKnife.syncUpTokenDB(rewardTokenAAddress);
    logger.info(`reward token - ${rewardToken.symbol} : ${rewardToken.address}`);

    //获取总质押token - SING的数量
    const lptContract = new ContractHelper(stakingToken.address, './erc20.json', network);
    const totalStakedBalance = new BigNumber(await lptContract.callReadMethod('balanceOf', Config.address.bank));
    logger.info(
        `total staked - ${totalStakedBalance.dividedBy(Math.pow(10, stakingToken.decimals)).toNumber().toFixed(6)} ${
            stakingToken.symbol
        }`,
    );

    //获取目标用户质押的token - SING的数量
    const userInfo = await vault.callReadMethod('userInfo', userAddress);
    const myStakedBalance = new BigNumber(userInfo.amount);
    logger.info(
        `my staked - ${myStakedBalance.dividedBy(Math.pow(10, stakingToken.decimals)).toNumber().toFixed(6)} ${
            stakingToken.symbol
        }`,
    );

    //获取目标用户可领取的奖励token的数量
    const pendingReward = new BigNumber(await vault.callReadMethod('pendingReward', userAddress));
    logger.info(
        `pending reward - ${pendingReward.dividedBy(Math.pow(10, rewardToken.decimals)).toNumber().toFixed(6)} ${
            rewardToken.symbol
        }`,
    );
};

const getFarmReceipt = async (userAddress: string) => {
    const masterChef = new ContractHelper(Config.address.masterChef, './Singular/master.sing.json', network);
    masterChef.toggleHiddenExceptionOutput();

    //获取奖励token SING的地址
    const rewardTokenAAddress = await masterChef.callReadMethod('sing');
    const rewardToken = await swissKnife.syncUpTokenDB(rewardTokenAAddress);
    logger.info(`reward token - ${rewardToken.symbol} : ${rewardToken.address}`);

    const poolLength = await masterChef.callReadMethod('poolLength');
    logger.info(`total ${poolLength} pools`);
    for (let pid = 0; pid < poolLength; pid++) {
        const userInfo = await masterChef.callReadMethod('userInfo', pid, userAddress);
        const stakedBalance = new BigNumber(userInfo.amount);
        if (stakedBalance.gt(0)) {
            const poolInfo = await masterChef.callReadMethod('poolInfo', pid);
            const lpToken = await swissKnife.syncUpTokenDB(poolInfo.lpToken);
            logger.info(`pool[${pid}] lpt - ${lpToken.symbol}: ${lpToken.address}`);
            logger.info(
                `pool[${pid}] staked: ${stakedBalance
                    .dividedBy(Math.pow(10, lpToken.decimals))
                    .toNumber()
                    .toFixed(8)} ${lpToken.symbol}`,
            );
            const pendingSing = new BigNumber(await masterChef.callReadMethod('pendingSing', pid, userAddress));
            logger.info(
                `pool[${pid}] pending reward: ${pendingSing
                    .dividedBy(Math.pow(10, rewardToken.decimals))
                    .toNumber()
                    .toFixed(8)} ${rewardToken.symbol}`,
            );
        }
    }
};

const main = async () => {
    await getBankReceipt('0xD2050719eA37325BdB6c18a85F6c442221811FAC');
    logger.info(`----------------------------------------------------`);
    await getFarmReceipt('0xD2050719eA37325BdB6c18a85F6c442221811FAC');
};

main().catch((e) => {
    logger.error(e.message);
});

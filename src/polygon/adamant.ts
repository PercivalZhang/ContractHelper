import { ContractHelper } from '../library/contract.helper';
import { LoggerFactory } from '../library/LoggerFactory';
import { NetworkType } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';
import BigNumber from 'bignumber.js';

const network = NetworkType.POLYGON;

const swissKnife = new SwissKnife(network);

const logger = LoggerFactory.getInstance().getLogger('main');

const Config = {
    addresses: {
        stakingDualRewards: '0xffd82f81513b207fb9d7d7835e178b6193f2ca96',
        lockedAddyVault: '0xc5bcd23f21b6288417eb6c760f8ac0fbb4bb8a56',
        multiFeeDistribution: '0x920f22e1e5da04504b765f8110ab96a20e6408bd'
    },
};
/**
 * 获取活期存款的信息
 * @param userAddress
 * Contract： 0x920f22e1e5da04504b765f8110ab96a20e6408bd
 */
const getDemandDepositReceipt = async (userAddress: string) => {
    const vault = new ContractHelper(
        Config.addresses.multiFeeDistribution,
        './Adamant/multi.fee.distribution.json',
        network,
    );
    vault.toggleHiddenExceptionOutput();

    //获取质押token的地址
    const stakingTokenAddress = await vault.callReadMethod('stakingToken');
    const stakingToken = await swissKnife.syncUpTokenDB(stakingTokenAddress);

    //获取奖励token A的地址
    const rewardTokenAAddress = await vault.callReadMethod('rewardTokens', 0);
    const rewardTokenA = await swissKnife.syncUpTokenDB(rewardTokenAAddress);
    //获取奖励token B的地址
    const rewardTokenBAddress = await vault.callReadMethod('rewardTokens', 1);
    const rewardTokenB = await swissKnife.syncUpTokenDB(rewardTokenBAddress);
    //获取奖励token C的地址
    const rewardTokenCAddress = await vault.callReadMethod('rewardTokens', 2);
    const rewardTokenC = await swissKnife.syncUpTokenDB(rewardTokenBAddress);
    //获取奖励token D的地址
    const rewardTokenDAddress = await vault.callReadMethod('rewardTokens', 3);
    const rewardTokenD = await swissKnife.syncUpTokenDB(rewardTokenBAddress);

    //获取总质押token - ADDY的数量
    const totalStakedBalance = new BigNumber(await vault.callReadMethod('totalSupply'));
    logger.info(
        `total staked - ${totalStakedBalance.dividedBy(Math.pow(10, stakingToken.decimals)).toNumber().toFixed(6)} ${
            stakingToken.symbol
        }`,
    );

    //获取目标用户质押的token - ADDY的数量
    const myStakedBalance = new BigNumber(await vault.callReadMethod('totalBalance', userAddress));
    logger.info(
        `my staked - ${myStakedBalance.dividedBy(Math.pow(10, stakingToken.decimals)).toNumber().toFixed(6)} ${
            stakingToken.symbol
        }`,
    );

    //获取目标用户可领取的两种奖励token的数量
    const pendingRewards = await vault.callReadMethod('claimableRewards', userAddress);
    console.log(pendingRewards)
    for(const rewardItem of pendingRewards) {
        const rewardToken = await swissKnife.syncUpTokenDB(rewardItem[0]);
        const pendingReward = new BigNumber(rewardItem[1]);
        logger.info(
            `pending reward - ${pendingReward.dividedBy(Math.pow(10, rewardToken.decimals)).toNumber().toFixed(6)} ${
                rewardToken.symbol
            }`,
        );
    }
};
/**
 * 获取Base Lock的信息
 * @param userAddress
 * Contract： 0xffd82f81513b207fb9d7d7835e178b6193f2ca96
 */
const getBasicLockReceipt = async (userAddress: string) => {
    const vault = new ContractHelper(
        Config.addresses.stakingDualRewards,
        './Adamant/staking.dual.rewards.json',
        network,
    );
    vault.toggleHiddenExceptionOutput();

    //获取质押token的地址
    const stakingTokenAddress = await vault.callReadMethod('stakingToken');
    const stakingToken = await swissKnife.syncUpTokenDB(stakingTokenAddress);

    //获取奖励token A的地址
    const rewardTokenAAddress = await vault.callReadMethod('rewardsTokenA');
    const rewardTokenA = await swissKnife.syncUpTokenDB(rewardTokenAAddress);
    //获取奖励token B的地址
    const rewardTokenBAddress = await vault.callReadMethod('rewardsTokenB');
    const rewardTokenB = await swissKnife.syncUpTokenDB(rewardTokenBAddress);

    //获取总质押token - ADDY的数量
    const totalStakedBalance = new BigNumber(await vault.callReadMethod('balance'));
    logger.info(
        `total staked - ${totalStakedBalance.dividedBy(Math.pow(10, stakingToken.decimals)).toNumber().toFixed(6)} ${
            stakingToken.symbol
        }`,
    );

    //获取目标用户质押的token - ADDY的数量
    const myStakedBalance = new BigNumber(await vault.callReadMethod('balanceOf', userAddress));
    logger.info(
        `my staked - ${myStakedBalance.dividedBy(Math.pow(10, stakingToken.decimals)).toNumber().toFixed(6)} ${
            stakingToken.symbol
        }`,
    );

    //获取目标用户质押的token的解锁时间
    const endingTimestamp = new BigNumber(await vault.callReadMethod('getEndingTimestamp', userAddress));
    const endingDatetime = new Date(endingTimestamp.multipliedBy(1000).toNumber());
    logger.info(`my locked shares will be avaiable by ${endingDatetime.toLocaleDateString()}`);

    //获取目标用户可领取的两种奖励token的数量
    const pendingRewardA = new BigNumber(await vault.callReadMethod('earnedA', userAddress));
    logger.info(
        `pending reward - ${pendingRewardA.dividedBy(Math.pow(10, rewardTokenA.decimals)).toNumber().toFixed(6)} ${
            rewardTokenA.symbol
        }`,
    );
    const pendingRewardB = new BigNumber(await vault.callReadMethod('earnedB', userAddress));
    logger.info(
        `pending reward - ${pendingRewardB.dividedBy(Math.pow(10, rewardTokenB.decimals)).toNumber().toFixed(6)} ${
            rewardTokenB.symbol
        }`,
    );
};
/**
 * 获取LockPlus的信息
 * @param userAddress
 * Contract： 0xffd82f81513b207fb9d7d7835e178b6193f2ca96
 */
const getLockPlusReceipt = async (userAddress: string) => {
    const vault = new ContractHelper(Config.addresses.lockedAddyVault, './Adamant/locked.addy.vault.json', network);
    vault.toggleHiddenExceptionOutput();

    //获取质押token的地址
    const stakingTokenAddress = await vault.callReadMethod('token');
    const stakingToken = await swissKnife.syncUpTokenDB(stakingTokenAddress);

    //获取奖励token - WMatic的地址
    const rewardTokenAddress = await vault.callReadMethod('rewardsToken');
    const rewardToken = await swissKnife.syncUpTokenDB(rewardTokenAddress);

    //获取总质押token - ADDY的数量
    const totalStakedBalance = new BigNumber(await vault.callReadMethod('balance'));
    logger.info(
        `total staked - ${totalStakedBalance.dividedBy(Math.pow(10, stakingToken.decimals)).toNumber().toFixed(6)} ${
            stakingToken.symbol
        }`,
    );

    //获取总份额的数量
    const totalShares = new BigNumber(await vault.callReadMethod('totalShares'));
    logger.info(`total shares - ${totalShares.toNumber()}`);

    //获取目标用户质押的token - ADDY的详情
    /*
     [ userInfo method Response ]
        shares   uint256 :  30978532295902081
        rewardDebt   uint256 :  115935871669783368
        lastDepositTime   uint256 :  1631945806
        ending_timestamp   uint256 :  1640585806
     */
    const myUserInfo = await vault.callReadMethod('userInfo', userAddress);
    //用户质押的份额数量
    const myShares = new BigNumber(myUserInfo[0]);
    logger.info(`my shares: ${myShares}`);
    //将份额转换为质押token的数量
    const myStakedBalance = totalStakedBalance.dividedBy(totalShares).multipliedBy(myShares).dividedBy(Math.pow(10, stakingToken.decimals));
    logger.info(
        `my staked - ${myStakedBalance.toNumber().toFixed(6)} ${
            stakingToken.symbol
        }`,
    );
    //用户质押的token的解锁时间
    const endingTimestamp = new BigNumber(myUserInfo[3]);
    const endingDatetime = new Date(endingTimestamp.multipliedBy(1000).toNumber());
    logger.info(`my locked shares will be avaiable by ${endingDatetime.toLocaleDateString()}`);

    //获取目标用户可领取的两种奖励token的数量
    const pendingReward = new BigNumber(await vault.callReadMethod('getPendingReward', userAddress));
    logger.info(
        `pending reward - ${pendingReward.dividedBy(Math.pow(10, rewardToken.decimals)).toNumber().toFixed(6)} ${
            rewardToken.symbol
        }`,
    );
};

const getLPStakingReceipt = async (lpVaultAddress: string, userAddress: string) => {
    const vault = new ContractHelper(lpVaultAddress, './Adamant/addy.staking.rewards.json', network);
    vault.toggleHiddenExceptionOutput();

    //获取质押token的地址
    const stakingTokenAddress = await vault.callReadMethod('stakingToken');
    const stakingToken = await swissKnife.syncUpTokenDB(stakingTokenAddress);
    
    //获取目标用户质押的lp token的数量: locked + unlocked
    const myStakedBalance = new BigNumber(await vault.callReadMethod('balanceOf', userAddress));
    logger.info(
        `my staked - ${myStakedBalance.dividedBy(Math.pow(10, 18)).toNumber().toFixed(6)} ${
            stakingToken.symbol
        }`,
    );
    // 获取锁定部分的LP Token信息    
    const myLockedBalanceData = await vault.callReadMethod('lockedStakesOf', userAddress);
    console.log(myLockedBalanceData);
    const myLockedBalance = new BigNumber(myLockedBalanceData[0].amount);
    const endingTimestamp = new BigNumber(myLockedBalanceData[0].ending_timestamp);
    const multiplier = new BigNumber(myLockedBalanceData[0].multiplier);
    logger.info(
        `my locked - ${myLockedBalance.dividedBy(Math.pow(10, 18)).toNumber().toFixed(6)} ${
            stakingToken.symbol
        }`,
    );
    logger.info(
        `my mutiplier - ${multiplier.dividedBy(Math.pow(10, 6)).toNumber().toFixed(6)}`
    );
    const endingDatetime = new Date(endingTimestamp.multipliedBy(1000).toNumber());
    logger.info(`my locked shares will be avaiable by ${endingDatetime.toLocaleDateString()}`);
    // 获取已经解锁的LP Token数量    
    const myUnlockedBalance = new BigNumber(await vault.callReadMethod('unlockedBalanceOf', userAddress));
    logger.info(
        `my unlocked - ${myUnlockedBalance.dividedBy(Math.pow(10, 18)).toNumber().toFixed(6)} ${
            stakingToken.symbol
        }`,
    );
}

const main = async () => {
    await getBasicLockReceipt('0xD2050719eA37325BdB6c18a85F6c442221811FAC');
    logger.info(`-------------------------------------`)
    await getLockPlusReceipt('0xD2050719eA37325BdB6c18a85F6c442221811FAC');
    logger.info(`-------------------------------------`)
    await getDemandDepositReceipt('0xD2050719eA37325BdB6c18a85F6c442221811FAC');
    logger.info(`-------------------------------------`)
    await getLPStakingReceipt('0xf7661ee874ec599c2b450e0df5c40ce823fef9d3','0xD2050719eA37325BdB6c18a85F6c442221811FAC') // quickswap ADDY/WETH LP
};

main().catch((e) => {
    logger.error(e.message);
});

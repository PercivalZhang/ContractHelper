import { ContractHelper } from '../library/contract.helper';
import { LoggerFactory } from '../library/LoggerFactory';
import { NetworkType } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';
import BigNumber from 'bignumber.js';

const network = NetworkType.POLYGON;

const swissKnife = new SwissKnife(network);

const logger = LoggerFactory.getInstance().getLogger('main');

const ShareTokenAddress = '0xb82A20B4522680951F11c94c54B8800c1C237693';
const CashTokenAddress = '0x3Ae112f0fF3893C8e8675De170FD72406e9580F2';

const BoardroomAddress = '0xf9f8e6c33cc5bd633d6e5494c52ba6d8f9ab6452';
const BoardroomWithTimelockAddress = '0xdcfc3b59b74567083a76308b6d84aef483148689';

const FeeDistributionAddress = '0x047e7D6E8f4b6dEBa0537A7c7e852C4272981075';

/* Farm中的yield挖矿就是流动性挖矿
    master chef 合约地址： 0x8e5860DF653A467D1cC5b6160Dd340E8D475724E
    PoolType
    enum PoolType { ERC20, ERC721, ERC1155 }
    只关注类为0的池子
*/

/**
 * 单币质押池，对应UI中的Pool部分
 * Deposit Fee is 2%.
 * Withdawal fee varies from 0% - 0.5%, depends on the deposit time.
 * @param vaultAddress 
 * @param userAddress 
 * Quick： 0x253f5089165579b86ddcae96143f871c1ec79031
 */
const getVaultReceipt = async (vaultAddress: string, userAddress: string) => {
    const vault = new ContractHelper(vaultAddress, './FarmHero/vault.json', network);
    vault.toggleHiddenExceptionOutput();

    const shareToken = await swissKnife.syncUpTokenDB(ShareTokenAddress);

    //获取奖励token的地址
    const rewardTokenAddress = await vault.callReadMethod('rewardToken');
    const rewardToken = await swissKnife.syncUpTokenDB(rewardTokenAddress);

    //获取目标用户质押的share token - Honor的数量
    const myBalance = new BigNumber(await vault.callReadMethod('balanceOf', userAddress));
    logger.info(
        `my staked - ${myBalance.dividedBy(Math.pow(10, shareToken.decimals)).toNumber().toFixed(6)} ${
            shareToken.symbol
        }`,
    );

    //获取目标用户可领取的奖励token数量
    const pendingReward = new BigNumber(await vault.callReadMethod('earned', userAddress));
    logger.info(
        `pending reward - ${pendingReward.dividedBy(Math.pow(10, rewardToken.decimals)).toNumber().toFixed(6)} ${
            rewardToken.symbol
        }`,
    );
}
/**
 * Boardroom董事会
 * No deposit fee, withdrawal fee.
 * Rewards (ZENY) can be freely traded.
 * @param boardroomAddress 
 * @param userAddress 
 * @param locked 
 */
const getBoardroomReceipt = async (boardroomAddress: string, userAddress: string, locked = true) => {
    const boardroom = new ContractHelper(boardroomAddress, './FarmHero/boardroom.json', network);
    boardroom.toggleHiddenExceptionOutput();

    const shareToken = await swissKnife.syncUpTokenDB(ShareTokenAddress);
    const cashToken = await swissKnife.syncUpTokenDB(CashTokenAddress);

    if (locked) {
        const timeLock = await boardroom.callReadMethod('timeLock');
        logger.info(`Unstake available in - ${timeLock} ms`);
    }
    // 总质押的share token的数量
    const totalSupply = new BigNumber(await boardroom.callReadMethod('totalSupply'));
    logger.info(
        `Total staked - ${totalSupply.dividedBy(Math.pow(10, shareToken.decimals)).toNumber().toFixed(6)} ${
            shareToken.symbol
        }`,
    );
    // 目标用户枝桠的share token数量     
    const myStakedBalance = new BigNumber(await boardroom.callReadMethod('balanceOf', userAddress));
    logger.info(
        `My staked - ${myStakedBalance.dividedBy(Math.pow(10, shareToken.decimals)).toNumber().toFixed(6)} ${
            shareToken.symbol
        }`,
    );
    // 目标用户可领取奖励cash token的数量
    const earnedReward = new BigNumber(await boardroom.callReadMethod('earned', userAddress));
    logger.info(
        `My earned reward - ${earnedReward.dividedBy(Math.pow(10, cashToken.decimals)).toNumber().toFixed(6)} ${
            cashToken.symbol
        }`,
    );
};
/**
 * 单币质押/锁定，多种奖励（3种奖励token）
 * 对应UI中Staking+Vesting
 * @param userAddress 
 */
const getStakingVestingReceipt = async (userAddress: string) => {
    const feeDistributor = new ContractHelper(FeeDistributionAddress, './FarmHero/fee.distribution.v2.json', network);
    feeDistributor.toggleHiddenExceptionOutput();

    const shareToken = await swissKnife.syncUpTokenDB(ShareTokenAddress);
    const cashToken = await swissKnife.syncUpTokenDB(CashTokenAddress);
    // 总质押（locked + unlocked）share token的数量
    const totalSupply = new BigNumber(await feeDistributor.callReadMethod('totalSupply'));
    logger.info(
        `Total staked - ${totalSupply.dividedBy(Math.pow(10, shareToken.decimals)).toNumber().toFixed(6)} ${
            shareToken.symbol
        }`,
    );
    // 获取用户stake质押token的数量= unlocked数量 + locked数量    
    const myTotalStakedBalance = new BigNumber(await feeDistributor.callReadMethod('totalBalance', userAddress));
    logger.info(
        `My total staked balance: ${myTotalStakedBalance.dividedBy(Math.pow(10, shareToken.decimals)).toNumber().toFixed(6)} ${
            shareToken.symbol
        }`,
    );
    // 获取用户vest锁定的那部分token的信息    
    /** 合约方法返回数据范例
    {
        '0': '2000000000000000000',
        '1': '0',
        '2': '2000000000000000000',
        '3': [
            [
            '2000000000000000000',
            '1639008000',
            amount: '2000000000000000000',
            unlockTime: '1639008000'
            ]
        ],
        total: '2000000000000000000',
        unlockable: '0',
        locked: '2000000000000000000',
        lockData: [
            [
            '2000000000000000000',
            '1639008000',
            amount: '2000000000000000000',
            unlockTime: '1639008000'
            ]
        ]
    }
    **/
    const myLockedBalanceData = await feeDistributor.callReadMethod('lockedBalances', userAddress);
    // 用户锁定token的数量
    const myLockedBalance = new BigNumber(myLockedBalanceData.lockData[0].amount);
    // 用户锁定token解锁时间，单位秒
    // convert second to millisecond
    const myExpiredTimestamp = new Date(new BigNumber(myLockedBalanceData.lockData[0].unlockTime).multipliedBy(1000).toNumber());
    logger.info(
        `My locked balance: ${myLockedBalance.dividedBy(Math.pow(10, shareToken.decimals)).toNumber().toFixed(6)} ${
            shareToken.symbol
        }`,
    );
    logger.info(
        `My locked shares will be avaiable by ${myExpiredTimestamp.toLocaleDateString()}`
    );
    // 获取用户解锁的token的数量
    const myUnlockedBalance = new BigNumber(await feeDistributor.callReadMethod('unlockedBalance', userAddress));
    logger.info(
        `My unlocked balance: ${myUnlockedBalance.dividedBy(Math.pow(10, shareToken.decimals)).toNumber().toFixed(6)} ${
            shareToken.symbol
        }`,
    );
    // 获取用户可领取奖励数量
    /* 可领取奖励返回数据范例：
    [
        [
            '0xb82A20B4522680951F11c94c54B8800c1C237693',
            '11478079920661448',
            token: '0xb82A20B4522680951F11c94c54B8800c1C237693',
            amount: '11478079920661448'
        ],
        [
            '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
            '0',
            token: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
            amount: '0'
        ],
        [
            '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
            '3519515536782',
            token: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
            amount: '3519515536782'
        ]
    ]
    */
    const claimableRewardData = await feeDistributor.callReadMethod('claimableRewards', userAddress);
    // 获取三种奖励token的信息
    const rewardToken1 = await swissKnife.syncUpTokenDB(claimableRewardData[0].token);
    const rewardToken2 = await swissKnife.syncUpTokenDB(claimableRewardData[1].token);
    const rewardToken3 = await swissKnife.syncUpTokenDB(claimableRewardData[2].token);   
    // 获取三种奖励token的balance 
    const rewardToken1Balance = new BigNumber(claimableRewardData[0].amount);
    const rewardToken2Balance = new BigNumber(claimableRewardData[1].amount);
    const rewardToken3Balance = new BigNumber(claimableRewardData[2].amount);

    logger.info(
        `Claimable reward: ${rewardToken1Balance.dividedBy(Math.pow(10, rewardToken1.decimals)).toNumber().toFixed(6)} ${
            rewardToken1.symbol
        }`,
    );
    logger.info(
        `Claimable reward: ${rewardToken2Balance.dividedBy(Math.pow(10, rewardToken2.decimals)).toNumber().toFixed(6)} ${
            rewardToken2.symbol
        }`,
    );
    logger.info(
        `Claimable reward: ${rewardToken3Balance.dividedBy(Math.pow(10, rewardToken3.decimals)).toNumber().toFixed(6)} ${
            rewardToken3.symbol
        }`,
    );
};

const main = async () => {
    await getBoardroomReceipt(BoardroomWithTimelockAddress, '0xD2050719eA37325BdB6c18a85F6c442221811FAC');
    await getBoardroomReceipt(BoardroomAddress, '0xD2050719eA37325BdB6c18a85F6c442221811FAC', false);
    logger.info(`--------------------------------------------------`)
    await getStakingVestingReceipt('0xD2050719eA37325BdB6c18a85F6c442221811FAC');
    logger.info(`--------------------------------------------------`)
    await getVaultReceipt('0x253f5089165579b86ddcae96143f871c1ec79031', '0xD2050719eA37325BdB6c18a85F6c442221811FAC');
};

main().catch((e) => {
    logger.error(e.message);
});

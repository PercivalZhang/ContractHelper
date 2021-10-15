import { ContractHelper } from '../library/contract.helper';
import { LoggerFactory } from '../library/LoggerFactory';
import { NetworkType } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';
import BigNumber from 'bignumber.js';

const network = NetworkType.POLYGON;

const swissKnife = new SwissKnife(network);

const logger = LoggerFactory.getInstance().getLogger('CafeSwap');
/**
 *
 */
const Config = {
    factory: {
        address: '0x5ede3f4e7203bf1f12d57af1810448e5db20f46c'
    },
    masterChef: {
        address: '0xca2DeAc853225f5a4dfC809Ae0B7c6e39104fCe5',
        methods: {
            poolLength: 'poolLength',
            userInfo: 'userInfo',
            poolInfo: 'poolInfo',
            pendingReward: 'pendingBrew',
            rewardToken: 'brew'
        },
        pool: {
            lpToken: 'lpToken'
        }
    },
    launchPool: {
        masterChef: {
            methods: {
                userInfo: 'userInfo',
                poolInfo: 'poolInfo',
                pendingReward: 'pendingReward',
                rewardToken: 'rewardToken',
            },
            pool: {
                lpToken: 'lpToken'
            }
        },
        addresses: [
            '0x9d0baaf701b36c0207a31952a988b7247720f42d',
            '0xe34a21beb0669d29f3b207582ad9b344a3bbf182'
        ]
    }
};
/**
 * 获取用户master chef挖矿的详情
 * 对应UI： Farm（双币LP）和Pool（单币LP）
 * @param userAddress 目标用户地址
 */
const getMasterChefFarmingReceipt = async (userAddress: string) => {
    const masterChef = new ContractHelper(Config.masterChef.address, './CafeSwap/master.chef.json', network);
    masterChef.toggleHiddenExceptionOutput();

    //获取奖励token SING的地址
    const rewardTokenAAddress = await masterChef.callReadMethod(Config.masterChef.methods.rewardToken);
    const rewardToken = await swissKnife.syncUpTokenDB(rewardTokenAAddress);
    logger.info(`reward token - ${rewardToken.symbol} : ${rewardToken.address}`);

    const poolLength = await masterChef.callReadMethod(Config.masterChef.methods.poolLength);
    logger.info(`total ${poolLength} pools`);
    for (let pid = 0; pid < poolLength; pid++) {
        const userInfo = await masterChef.callReadMethod(Config.masterChef.methods.userInfo, pid, userAddress);
        const myStakedBalance = new BigNumber(userInfo.amount);
        if (myStakedBalance.gt(0)) {
            const poolInfo = await masterChef.callReadMethod(Config.masterChef.methods.poolInfo, pid);
            const lpTokenAddress = poolInfo[Config.masterChef.pool.lpToken];
            const isPairedLPToken = await swissKnife.isLPToken(lpTokenAddress); 
            if(isPairedLPToken) {
                const lpToken = await swissKnife.getLPTokenDetails(lpTokenAddress);
                logger.info(
                    `pool[${pid}] > my staked token: ${myStakedBalance
                        .dividedBy(Math.pow(10, 18))
                        .toNumber()
                        .toFixed(10)} ${lpToken.token0.symbol}/${lpToken.token1.symbol} LP`,
                );
            } else {
                const erc20Token = await swissKnife.syncUpTokenDB(lpTokenAddress);
                logger.info(
                    `pool[${pid}] > my staked token: ${myStakedBalance
                        .dividedBy(Math.pow(10, erc20Token.decimals))
                        .toNumber()
                        .toFixed(10)} ${erc20Token.symbol}`,
                );
            }
            const pendingReward = new BigNumber(await masterChef.callReadMethod(Config.masterChef.methods.pendingReward, pid, userAddress));
            logger.info(
                `pool[${pid}] pending reward: ${pendingReward
                    .dividedBy(Math.pow(10, rewardToken.decimals))
                    .toNumber()
                    .toFixed(8)} ${rewardToken.symbol}`,
            );
        }
    }
};
/**
 * 获取获取用户lauchpool的质押挖矿详情
 * lauchpool： 质押pBrew，获取奖励token
 * @param cafeChefAddress lauch pool master chef contract address
 * @param userAddress     目标用户地址
 */
const getLauchPoolReceipt = async (cafeChefAddress: string, userAddress: string) => {
    const masterChef = new ContractHelper(cafeChefAddress, './CafeSwap/launch.pool.json', network);
    masterChef.toggleHiddenExceptionOutput();

    //获取奖励token SING的地址
    const rewardTokenAddress = await masterChef.callReadMethod(Config.launchPool.masterChef.methods.rewardToken);
    const rewardToken = await swissKnife.syncUpTokenDB(rewardTokenAddress);
    logger.info(`launchpool[${rewardToken.symbol}] > reward token - ${rewardToken.symbol} : ${rewardToken.address}`);
    
    const userInfo = await masterChef.callReadMethod(Config.launchPool.masterChef.methods.userInfo, userAddress);
    const myStakedBalance = new BigNumber(userInfo.amount);
    if (myStakedBalance.gt(0)) {
        const poolInfo = await masterChef.callReadMethod(Config.launchPool.masterChef.methods.poolInfo, 0);
        const lpTokenAddress = poolInfo[Config.launchPool.masterChef.pool.lpToken];
        const isPairedLPToken = await swissKnife.isLPToken(lpTokenAddress); 
        if(isPairedLPToken) {
            const lpToken = await swissKnife.getLPTokenDetails(lpTokenAddress);
            logger.info(
                `launchpool[${rewardToken.symbol}] > my staked token: ${myStakedBalance
                    .dividedBy(Math.pow(10, 18))
                    .toNumber()
                    .toFixed(10)} ${lpToken.token0.symbol}/${lpToken.token1.symbol} LP`,
            );
        } else {
            const erc20Token = await swissKnife.syncUpTokenDB(lpTokenAddress);
            logger.info(
                `launchpool[${rewardToken.symbol}] > my staked token: ${myStakedBalance
                    .dividedBy(Math.pow(10, erc20Token.decimals))
                    .toNumber()
                    .toFixed(10)} ${erc20Token.symbol}`,
            );
        }
        const pendingReward = new BigNumber(await masterChef.callReadMethod(Config.launchPool.masterChef.methods.pendingReward, userAddress));
        logger.info(
            `launchpool[${rewardToken.symbol}] > pending reward: ${pendingReward
                .dividedBy(Math.pow(10, rewardToken.decimals))
                .toNumber()
                .toFixed(8)} ${rewardToken.symbol}`,
        );
    }
};

const main = async () => {
    await getMasterChefFarmingReceipt('0xD2050719eA37325BdB6c18a85F6c442221811FAC');
    console.log(`\n-------------------------------------------------------------------------\n`);
    for(const cafeChefAddress of Config.launchPool.addresses) {
        await getLauchPoolReceipt(cafeChefAddress, '0xD2050719eA37325BdB6c18a85F6c442221811FAC')
        console.log(`\n---------------------------------------------------------------------\n`);
    }
};

main().catch((e) => {
    logger.error(e.message);
});

import { ContractHelper } from '../../library/contract.helper';
import { LoggerFactory } from '../../library/LoggerFactory';
import { NetworkType } from '../../library/web3.factory';
import { SwissKnife } from '../../library/swiss.knife';
import { MasterChefHelper } from '../../library/master.chef';
import BigNumber from 'bignumber.js';

const Config = {
    //LP挖矿
    farmChef: {
        address: '0xb0523f9f473812fb195ee49bc7d2ab9873a98044',
        methods: {
            poolLength: 'poolLength',
            userInfo: 'userInfo',
            poolInfo: 'poolInfo',
            pendingReward: 'pendingTokens',
            rewardToken: 'ptp',
            totalAllocPoint: 'totalAllocPoint',
        },
        pool: {
            lpToken: 'lpToken',
            allocPoint: 'allocPoint',
        },
    },
    // vault: {
    //     vvsVVSAuto: '0xa6ff77fc8e839679d4f7408e8988b564de1a2dcd', //vvs自动复投
    //     vvsBIFI: '0x1a888d7b2abfd2b5046d8461e6d1703f654a8fc0', //vvs->BIFI
    // },
    ptp: '0x22d4002028f537599be9f666d1c4fa138522f9c8',
    poolManager: '0x66357dcace80431aee0a7507e2e361b7e2402370',
};

const network = NetworkType.AVALANCHE;

const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('farm');

const masterChef = new MasterChefHelper(network, Config.farmChef, './Avalanche/platypus/master.chef.json');

//SOLO单币池奖励token是两个一个是wMatic，一个是usdc
const handlePendingReward = async (pid: number, pendingRewardData: any) => {
    const pendingRwardPTP = new BigNumber(pendingRewardData['0']);
    const ptpToken = await swissKnife.syncUpTokenDB(Config.ptp);
    logger.info(
        `pool[${pid}] > pending rewards: ${pendingRwardPTP
            .dividedBy(Math.pow(10, ptpToken.decimals))
            .toNumber()
            .toFixed(8)} ${ptpToken.symbol}`,
    );
};
const handleLPT = async (pid: number, lpTokenAddress: string, lptBalance: BigNumber) => {
    const lpTokenHelper = new ContractHelper(lpTokenAddress, './Avalanche/platypus/lp.token.json', network);
    const lpToken = await swissKnife.syncUpTokenDB(lpTokenAddress);

    const poolManager = new ContractHelper(Config.poolManager, './Avalanche/platypus/pool.manager.json', network);

    logger.info(
        `pid[${pid}] > staked lp token balance: ${lpToken.readableAmount(lptBalance.toNumber().toString())} ${
            lpToken.symbol
        }`,
    );

    const underlyingTokenAddress = await lpTokenHelper.callReadMethod('underlyingToken');
    const underlyingToken = await swissKnife.syncUpTokenDB(underlyingTokenAddress);

    const underlyingTokenBalanceData = await poolManager.callReadMethod(
        'quotePotentialWithdraw',
        underlyingTokenAddress,
        lptBalance.toNumber(),
    );
    logger.info(
        `pid[${pid}] > underlying token balance: ${underlyingToken.readableAmount(underlyingTokenBalanceData['0'])} ${
            underlyingToken.symbol
        }`,
    );
};

const calculateLPTWithdrawBalance = async (lpTokenAddress: string, lptBalance: BigNumber): Promise<BigNumber> => {
    const lpTokenHelper = new ContractHelper(lpTokenAddress, './Avalanche/platypus/lp.token.json', network);
    const lpToken = await swissKnife.syncUpTokenDB(lpTokenAddress);

    const poolManager = new ContractHelper(Config.poolManager, './Avalanche/platypus/pool.manager.json', network);

    logger.info(`lp token balance: ${lpToken.readableAmount(lptBalance.toNumber().toString())} ${lpToken.symbol}`);

    const underlyingTokenAddress = await lpTokenHelper.callReadMethod('underlyingToken');
    const underlyingToken = await swissKnife.syncUpTokenDB(underlyingTokenAddress);

    const underlyingTokenBalanceData = await poolManager.callReadMethod(
        'quotePotentialWithdraw',
        underlyingTokenAddress,
        lptBalance.toNumber(),
    );
    logger.info(
        `underlying token balance: ${underlyingToken.readableAmount(underlyingTokenBalanceData['0'])} ${
            underlyingToken.symbol
        }`,
    );
    return new BigNumber(underlyingTokenBalanceData['0']);
};

const main = async () => {
    // pid - 47对应界面中的Staking > GINSPIRIT/SPIRIT LP
    await masterChef.getFarmingReceiptsWithCallbacks(
        '0x881897b1FC551240bA6e2CAbC7E59034Af58428a',
        handleLPT,
        handlePendingReward,
    );
    const poolInfo = await masterChef.getPoolInfo(1);
    const lptAddress = poolInfo[Config.farmChef.pool.lpToken];
    const pool1LPTBalance = await masterChef.getPoolLPTBalance(1);
    console.log(pool1LPTBalance.toNumber());
    console.log(lptAddress);
    const pool1Balance = await calculateLPTWithdrawBalance(lptAddress, pool1LPTBalance);

    console.log(pool1Balance.toNumber());
    const annualRewardUSD = new BigNumber(913242009132420000)
        .multipliedBy(3600 * 24 * 365)
        .multipliedBy(3.91)
        .dividedBy(1e18);
    console.log(annualRewardUSD.toNumber().toFixed(6));
    await masterChef.getAPY(1, pool1Balance.dividedBy(1e18), annualRewardUSD);
};

main().catch((e) => {
    logger.error(e.message);
});

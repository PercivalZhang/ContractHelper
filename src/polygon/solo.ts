import { ContractHelper } from '../library/contract.helper';
import { LoggerFactory } from '../library/LoggerFactory';
import { NetworkType } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';
import BigNumber from 'bignumber.js';
import { MasterChefHelper } from '../library/master.chef';

const network = NetworkType.POLYGON;

const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('main');

const Config = {
    farmChef: {
        address: '0xe95876787b055f1b9e4cfd5d3e32bde302bf789d', //单币master chef合约地址
        methods: {
            poolLength: 'poolsLength',
            userInfo: 'users',
            poolInfo: 'pools',
            pendingReward: 'unclaimedReward',
            rewardToken: 'rewardToken',
        },
        pool: {
            lpToken: 'token',
        },
    },
};
//SOLO单币池奖励token是两个一个是wMatic，一个是usdc
const handlePendingReward = async (pendingRewardData: any) => {
    const rewardToken0 = await swissKnife.syncUpTokenDB('0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270');
    const rewardToken1 = await swissKnife.syncUpTokenDB('0x2791bca1f2de4661ed88a30c99a7a9449aa84174');
    const pendingRewardToken0 = new BigNumber(pendingRewardData['0']);
    const pendingRewardToken1 = new BigNumber(pendingRewardData['1']);

    logger.info(
        `my pending reward: ${pendingRewardToken0
            .dividedBy(Math.pow(10, rewardToken0.decimals))
            .toNumber()
            .toFixed(8)} ${rewardToken0.symbol}`,
    );
    logger.info(
        `my pending reward: ${pendingRewardToken1
            .dividedBy(Math.pow(10, rewardToken1.decimals))
            .toNumber()
            .toFixed(8)} ${rewardToken1.symbol}`,
    );
};

const masterChef = new MasterChefHelper(network, Config.farmChef, './Solo/master.chef.json');

const main = async () => {
    await masterChef.getFarmingReceipts(
        '0xc2d54b0da70e29ab733780594e267cebcccc9b71',
        Config.farmChef,
        handlePendingReward,
    );
    console.log(`\n-------------------------------------------------------------------------\n`);
};

main().catch((e) => {
    logger.error(e.message);
});

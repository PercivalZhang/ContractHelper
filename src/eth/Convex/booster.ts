import { ContractHelper } from '../../library/contract.helper';
import { LoggerFactory } from '../../library/LoggerFactory';
import { NetworkType } from '../../library/web3.factory';
import { SwissKnife } from '../../library/swiss.knife';
import BigNumber from 'bignumber.js';
import * as fs from 'fs';
import path from 'path';
import { ERC20Token } from '../../library/erc20.token';

type Reward = {
    token: ERC20Token;
    rate: string;
    price: string;
};
type Coin = {
    token: ERC20Token;
    amount: string;
    price: string;
};
type PoolInfo = {
    pid: number;
    lpToken: string;
    token: string;
    totalLPTBalance: string;
    gauge: string;
    crvRewards: string;
    coins: Coin[];
    rewards: Reward[];
};
const Config = {
    CVX: '0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b',
    booster: '0xf403c135812408bfbe8713b5a23a04b3d48aae31',
    pools: {
        '0xc4AD29ba4B3c580e6D59105FFf484999997675Ff': 38, // lp Token -> pool_id
    },
};

const network = NetworkType.ETH_MAIN;

const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('main');

const findPoolId = async (lptAddress: string): Promise<number> => {
    const booster = new ContractHelper(Config.booster, './ETH/Convex/booster.json', network);
    const poolLength = await booster.callReadMethod('poolLength');
    for (let i = 0; i < poolLength; i++) {
        const poolInfo = await booster.callReadMethod('poolInfo', i);
        const lpTokenAddress = poolInfo['lptoken'];
        if (lptAddress.toLowerCase() === lpTokenAddress.toLowerCase()) {
            logger.info(`findPoolId > detected pool[${i}]: ${lptAddress}`);
            return i;
        }
    }
    return -1;
};

const main = async () => {
    await findPoolId('0x5a6A4D54456819380173272A5E8E9B9904BdF41B');
};

main().catch((e) => {
    logger.error(e.message);
});

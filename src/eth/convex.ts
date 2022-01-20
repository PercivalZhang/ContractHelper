/**
 * Booster合约： https://etherscan.io/address/0xf403c135812408bfbe8713b5a23a04b3d48aae31#code
 * - Methods方法：
 * -- poolInfo(_pid): pid = 38
 *      lptoken   address :  0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c // Curve LP Token地址
        token   address :  0xCA3D9F45FfA69ED454E66539298709cb2dB8cA61   // 存款凭证token： 1:1
        gauge   address :  0x9582C4ADACB3BCE56Fea3e590F05c3ca2fb9C477
        crvRewards   address :  0x02E2151D4F351881017ABdF2DD2b51150841d5B3 // CRV奖励合约
        stash   address :  0x521e6EEfDa35f7228f8f83462552bDB41D64d86B
        shutdown   bool :  false
 * 
 * CRV奖励合约：Convex平台上每一个curve LPT都有一个对应的该合约    
 * - Methods方法：
 * -- balanceOf(_userAddress): 获取用户质押凭证token数量
 * -- earned(_userAddress): 获取用户可领取的CRV token数量
 * 
 * CVX奖励计算：CVX合约： https://etherscan.io/address/0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b#code
 * - mint(address, amount)
 * -- 参考如下代码，_amount 初始值 = CRV奖励数量
 *      // use current supply to gauge cliff
        //this will cause a bit of overflow into the next cliff range
        //but should be within reasonable levels.
        //requires a max supply check though
        uint256 cliff = supply.div(reductionPerCliff);
        //mint if below total cliffs
        if(cliff < totalCliffs){
            //for reduction% take inverse of current cliff
            uint256 reduction = totalCliffs.sub(cliff);
            //reduce
            _amount = _amount.mul(reduction).div(totalCliffs);

            //supply cap check
            uint256 amtTillMax = maxSupply.sub(supply);
            if(_amount > amtTillMax){
                _amount = amtTillMax;
            }

           return _amount;
        }        
 */

import { ContractHelper } from '../library/contract.helper';
import { LoggerFactory } from '../library/LoggerFactory';
import { NetworkType } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';
import BigNumber from 'bignumber.js';
import * as fs from 'fs';
import path from 'path';
import { ERC20Token } from '../library/erc20.token';

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

/**
 * 计算奖励CVX Token的数量
 * @param inputAmount - 奖励CRV Token数量，通过baseReward合约的方法earned(_user)获取
 * @returns
 */

const calculateCVXRewards = async (inputAmount: BigNumber): Promise<BigNumber> => {
    let amount = inputAmount;
    const cvx = new ContractHelper(Config.CVX, './ETH/Convex/cvx.json', network);
    const supply = new BigNumber(await cvx.callReadMethod('totalSupply'));
    if (supply.eq(0)) {
        return amount;
    }
    logger.info(`cvx supply is not ZERO`);
    const reductionPerCliff = await cvx.callReadMethod('reductionPerCliff');
    const totalCliffs = new BigNumber(await cvx.callReadMethod('totalCliffs'));
    const maxSupply = new BigNumber(await cvx.callReadMethod('maxSupply'));
    const cliff = supply.dividedBy(reductionPerCliff);
    //mint if below total cliffs
    if (cliff.isLessThan(totalCliffs)) {
        logger.info(`cliff is less than totalCliffs`);
        //for reduction% take inverse of current cliff
        const reduction = totalCliffs.minus(cliff);
        //reduce
        amount = amount.multipliedBy(reduction).dividedBy(totalCliffs);

        //supply cap check
        const amtTillMax = maxSupply.minus(supply);
        if (amount.isGreaterThan(amtTillMax)) {
            amount = amtTillMax;
        }
        return amount;
    }
};

const getCurveLPDetails = async (lpTokenAddress: string, coinSize: number, lptBalance: string) => {
    const coins: Coin[] = [];
    const lpToken = new ContractHelper(lpTokenAddress, './ETH/Curve/lp.token.json', network);
    const totalLPT = await lpToken.callReadMethod('totalSupply');
    const ratio = new BigNumber(lptBalance).dividedBy(totalLPT);

    const poolAddress = await lpToken.callReadMethod('minter');
    const pool = new ContractHelper(poolAddress, './ETH/Curve/pool.v1.json', network);
    for (let i = 0; i < coinSize; i++) {
        const coinAddress = await pool.callReadMethod('coins', i);
        const coinToken = await swissKnife.syncUpTokenDB(coinAddress);

        const coinBalance = await pool.callReadMethod('balances', i);
        const myCoinBalance = coinToken.readableAmountFromBN(new BigNumber(coinBalance).multipliedBy(ratio)).toFixed(6);
        coins.push({
            token: coinToken,
            amount: myCoinBalance,
            price: '',
        });
    }
    return coins;
};

const getPoolInfo = async (pid: number): Promise<PoolInfo> => {
    const poolInfo: PoolInfo = {
        pid: 0,
        lpToken: '',
        token: '',
        totalLPTBalance: '',
        gauge: '',
        crvRewards: '',
        coins: [],
        rewards: [],
    };
    const CVX = await swissKnife.syncUpTokenDB(Config.CVX);
    poolInfo.pid = pid;
    const booster = new ContractHelper(Config.booster, './ETH/Convex/booster.json', network);
    const poolData = await booster.callReadMethod('poolInfo', pid);
    poolInfo.lpToken = poolData['lptoken'];
    poolInfo.token = poolData['token'];
    poolInfo.gauge = poolData['gauge'];
    poolInfo.crvRewards = poolData['crvRewards'];

    const cToken = new ContractHelper(poolInfo.token, './erc20.json', network);
    const cTokenTotalSupply = await cToken.callReadMethod('totalSupply');
    poolInfo.totalLPTBalance = cTokenTotalSupply;

    const coins = await getCurveLPDetails(poolInfo.lpToken, 3, poolInfo.totalLPTBalance);
    poolInfo.coins = coins;

    const baseRewards = new ContractHelper(poolData['crvRewards'], './ETH/Convex/base.reward.json', network);
    // CRV Token地址
    const baseRewardTokenAddress = await baseRewards.callReadMethod('rewardToken');
    const baseRewardToken = await swissKnife.syncUpTokenDB(baseRewardTokenAddress);
    const baseRewardRate = await baseRewards.callReadMethod('rewardRate');
    logger.info(`detected base reward - ${baseRewardToken.symbol}: ${baseRewardToken.address}`);
    poolInfo.rewards.push({
        token: baseRewardToken,
        rate: baseRewardRate,
        price: '',
    });
    // demo如何根据base Reward token - CRV的数量，计算奖励CVX token的数量
    const earned = await baseRewards.callReadMethod('earned', '0x73cae59e9d6e73b43ad32de120b456783f72b7aa');
    logger.info(
        `user - 0x73cae59e9d6e73b43ad32de120b456783f72b7aa earned: ${baseRewardToken
            .readableAmount(earned)
            .toFixed(4)} ${baseRewardToken.symbol}`,
    );
    const cvxRewards = await calculateCVXRewards(new BigNumber(earned));
    logger.info(
        `user =  0x73cae59e9d6e73b43ad32de120b456783f72b7aa earned: ${CVX.readableAmountFromBN(cvxRewards).toFixed(
            4,
        )} ${CVX.symbol}`,
    );

    const extraRewardsLength = Number.parseInt(await baseRewards.callReadMethod('extraRewardsLength'));
    logger.info(`extra rewards length: ${extraRewardsLength}`);
    if (extraRewardsLength > 0) {
        for (let i = 0; i < extraRewardsLength; i++) {
            const extraRewardsAddress = await baseRewards.callReadMethod('extraRewards', i);
            const extraRewards = new ContractHelper(extraRewardsAddress, './ETH/Convex/base.reward.json', network);
            const extraRewardTokenAddress = await extraRewards.callReadMethod('rewardToken');
            const extraRewardToken = await swissKnife.syncUpTokenDB(extraRewardTokenAddress);
            const extraRewardRate = await extraRewards.callReadMethod('rewardRate');
            logger.info(`detected extra reward - ${extraRewardToken.symbol}: ${extraRewardToken.address}`);
            poolInfo.rewards.push({
                token: extraRewardToken,
                rate: extraRewardRate,
                price: '',
            });
        }
    }
    poolInfo.rewards.push({
        token: CVX,
        rate: '',
        price: '',
    });

    return poolInfo;
};

const main = async () => {
    for (const [poolAddress, pid] of Object.entries(Config.pools)) {
        const poolInfo = await getPoolInfo(pid);
        console.log(JSON.stringify(poolInfo));
    }
};

main().catch((e) => {
    logger.error(e.message);
});

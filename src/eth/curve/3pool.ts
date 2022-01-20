import { ContractHelper } from '../../library/contract.helper';
import { LoggerFactory } from '../../library/LoggerFactory';
import { NetworkType } from '../../library/web3.factory';
import { SwissKnife } from '../../library/swiss.knife';
import BigNumber from 'bignumber.js';
import * as fs from 'fs';
import path from 'path';
import { ERC20Token } from '../../library/erc20.token';

const network = NetworkType.ETH_MAIN;

const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('main');

type Gauge = {
    address: string;
    relativeWeight: string;
};
type Reward = {
    token: ERC20Token;
    rate: string;
    price: string;
};
type Coin = {
    token: ERC20Token;
    amount: string;
    totalUSD: string;
    ratio: string;
    price: string;
    priceOracle: string;
    priceScale: string;
};
type PoolV1Params = {
    version: number;
    coinSize: number;
    coinPriceMap: Map<number, number>;
    gauge: string;
};
type PoolV2Params = {
    version: number;
    coinSize: number;
    gauge: string;
};
type GaugeInfo = {
    address: string;
    relativeWeight: string;
    lptAddress: string;
    rewards: Reward[];
};
type Receipt = {
    stakedLPT: {
        token: ERC20Token;
        balance: string;
    };
    claimableReward: {
        token: ERC20Token;
        balance: string;
    };
};
type GaugeResut = {
    gauge: GaugeInfo;
    receipt: Receipt;
};

const Config = {
    crv: '0xD533a949740bb3306d119CC777fa900bA034cd52',
    stableCoin: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    gaugeController: '0x2f50d538606fa9edd2b11e2446beb18c9d5846bb',
    pools: {
        v2: {
            '0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7': {
                // 3Pool
                version: 2,
                coinSize: 3,
                gauge: '0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A',
            },
        },
    },
};

const getGaugeInfoAndUserReceipt = async (gaugeAddress: string, userAddress: string): Promise<GaugeResut> => {
    const result: GaugeResut = {
        gauge: {
            address: '',
            relativeWeight: '',
            lptAddress: '',
            rewards: [],
        },
        receipt: {
            stakedLPT: {
                token: undefined,
                balance: '',
            },
            claimableReward: {
                token: undefined,
                balance: '',
            },
        },
    };
    result.gauge.address = gaugeAddress;
    try {
        // 加载gauge合约
        const gauge = new ContractHelper(gaugeAddress, './ETH/Curve/gauge.3pool.json', network);
        // 获取LP Token地址
        const lptAddress = await gauge.callReadMethod('lp_token');
        const lpERC20Token = await swissKnife.syncUpTokenDB(lptAddress);
        result.gauge.lptAddress = lptAddress;
        // 3Pool池子奖励一种token -CRV
        const rewardTokenAddress = await gauge.callReadMethod('crv_token');
        console.log(rewardTokenAddress);
        const rewardToken = await swissKnife.syncUpTokenDB(rewardTokenAddress);
        // CRV的增发速度
        const rewardTokenInfationRate = await gauge.callReadMethod('inflation_rate');
        result.gauge.rewards.push({
            token: rewardToken,
            rate: rewardTokenInfationRate,
            price: '',
        });
        // 获取用户质押LP Token数量
        const userStakedLPTBalance = await gauge.callReadMethod('balanceOf', userAddress);
        // 获取用户可领取奖励token -CRV数量
        const userClaimableRewards = await gauge.callReadMethod('claimable_tokens', userAddress);
        const receipt = {
            stakedLPT: {
                token: lpERC20Token,
                balance: userStakedLPTBalance,
            },
            claimableReward: {
                token: rewardToken,
                balance: userClaimableRewards,
            },
        };
        result.receipt = receipt;
        const gController = new ContractHelper(Config.gaugeController, './ETH/Curve/gauge.controller.json', network);
        const relativeWeight = await gController.callReadMethod('gauge_relative_weight', gaugeAddress);
        result.gauge.relativeWeight = relativeWeight;
        return result;
    } catch (e) {
        logger.error(e.message);
    }
};

const main = async () => {
    for (const [poolAddress, poolParams] of Object.entries(Config.pools.v2)) {
        const gaugeAddress = Config.pools.v2['0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7'].gauge;
        const gaugeResult = await getGaugeInfoAndUserReceipt(
            gaugeAddress,
            '0xc5e6081e7fd4fe2c180e670a3c117a3649a9b7c2',
        );
        console.log(JSON.stringify(gaugeResult));
    }
};

main().catch((e) => {
    logger.error(e.message);
});

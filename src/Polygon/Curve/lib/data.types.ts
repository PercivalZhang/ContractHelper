import { ERC20Token } from '../../../library/erc20.token';
import { PoolCategory } from '../config';

type Gauge = {
    address: string;
    relativeWeight: string;
};
export type Coin = {
    token: ERC20Token;
    amount: string;
    totalUSD: string;
    ratio: string;
    price: string;
    priceOracle: string;
    priceScale: string;
};
export type PoolV1Info = {
    poolAddress: string;
    poolName: string;
    totalUSD: string;
    lpToken: string;
    gauge: Gauge;
    adminFee: string;
    fee: string;
    a: string;
    gamma: string;
    coins: Coin[];
    rewards: Reward[];
};

export type PoolV1Params = {
    version: number;
    pType: PoolCategory;
    coinSize: number;
    coinPriceMap: Map<number, number>;
    gauge: {
        address: string;
        rewardManager: string;
    };
};

export type Reward = {
    token: ERC20Token;
    rate: string;
    price: string;
};

export type GaugeInfo = {
    address: string;
    relativeWeight: string;
    lptAddress: string;
    rewards: Reward[];
};

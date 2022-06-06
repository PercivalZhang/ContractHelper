import { LoggerFactory } from '../../library/LoggerFactory';
import BigNumber from 'bignumber.js';
import { ContractHelper } from '../../library/contract.helper';
import { SwissKnife } from '../../library/swiss.knife';
import { Config } from './Config';
import { ERC20Token } from '../../library/erc20.token';
import { UniV3Util } from '../../library/uni.v3/uni.v3.util';
import { timeStamp } from 'console';

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
};
type PoolInfo = {
    poolAddress: string;
    poolName: string;
    totalUSD: string;
    lpToken: ERC20Token;
    gauge: Gauge;
    fees: {
        pool: string;
        admin: string;
    };
    a: string;
    futureA: string;
    coins: Coin[];
    underlyingCoins: Coin[];
    rewards: Reward[];
};

type GaugeInfo = {
    address: string;
    relativeWeight: string;
    rewards: Reward[];
};

const logger = LoggerFactory.getInstance().getLogger('FarmingPool');
const gSwissKnife = new SwissKnife(Config.network);

export class FactoryPool {
    public readonly address: string;
    //private itself: ContractHelper;
    private registry: ContractHelper
    private gaugeController; ContractHelper
    private hideExceptionOutput: boolean;

    constructor(poolAddress: string) {
        //this.itself = new ContractHelper(poolAddress, './Arbitrum/izumi/booster.json', Config.network);
        this.address = poolAddress;
        this.registry = new ContractHelper(Config.registry, './ETH/Curve/registry.json', Config.network);
        this.gaugeController = new ContractHelper(Config.registry, './ETH/Curve/gauge.controller.json', Config.network)
        this.hideExceptionOutput = false;
    }

    public toggleHiddenExceptionOutput() {
        this.hideExceptionOutput = !this.hideExceptionOutput;
    }

    public async getPoolInfo() {
        let poolInfo: PoolInfo = {
            poolAddress: '',
            poolName: '',
            totalUSD: '',
            lpToken: null,
            gauge: {
                address: '',
                relativeWeight: ''
            },
            fees: null,
            a: '',
            futureA: '',
            coins: [],
            underlyingCoins: [],
            rewards: []
        }
        poolInfo.poolAddress = this.address
        //获取pool name
        const poolName = await this.registry.callReadMethod('get_pool_name', this.address)
        poolInfo.poolName = poolName
        //获取pool lp token地址
        const lpTokenAddress = await this.registry.callReadMethod('get_lp_token', this.address)
        const lpToken = await gSwissKnife.syncUpTokenDB(lpTokenAddress)
        poolInfo.lpToken = lpToken
        //获取wrap coin和underlying coin的个数
        const numsOfcoins = await this.registry.callReadMethod('get_n_coins', this.address)
        //获取wrap coins numbers
        const wCoinNumber = numsOfcoins[0]
        //获取underlying coins numbers
        const underlyingCoinNumber = numsOfcoins[1]
        //获取wrap coin地址列表
        const wCoins = await this.registry.callReadMethod('get_coins', this.address)
        //获取underlying coin的地址列别
        const uCoins = await this.registry.callReadMethod('get_underlying_coins', this.address)
        //获取wrap coin余额
        const wCoinBalances = await this.registry.callReadMethod('get_balances', this.address)
        //获取underlying coin余额
        const uCoinBalances = await this.registry.callReadMethod('get_underlying_balances', this.address)
        //获取wrap coin的Token信息和余额    
        for (let i = 0; i < wCoinNumber; i++) {
            const wCoinAddress = wCoins[i]
            const wCoin = await gSwissKnife.syncUpTokenDB(wCoinAddress)
            const wCoinBalance = wCoin.readableAmount(wCoinBalances[i]).toFixed(4)
            poolInfo.coins.push({
                token: wCoin,
                amount: wCoinBalance
            })    
        }
        //获取underlying coin的Token信息和余额  
        for (let i = 0; i < underlyingCoinNumber; i++) {
            const uCoinAddress = uCoins[i]
            const uCoin = await gSwissKnife.syncUpTokenDB(uCoinAddress)
            const uCoinBalance = uCoin.readableAmount(uCoinBalances[i]).toFixed(4)
            poolInfo.underlyingCoins.push({
                token: uCoin,
                amount: uCoinBalance
            })    
        }
        //获取pool fee信息（swapFee/adminFee）
        const fees = await this.registry.callReadMethod('get_fees', this.address)
        poolInfo.fees = {
            pool: new BigNumber(fees[0]).dividedBy(1e10).multipliedBy(100).toNumber().toFixed(3) + '%',
            admin: new BigNumber(fees[1]).dividedBy(1e10).multipliedBy(100).toNumber().toFixed(3) + '%' // percentage of pool fee
        }
        //获取A值
        const a = await this.registry.callReadMethod('get_A', this.address)
        poolInfo.a = a

        return poolInfo
    }

    public async getGaugeInfo(gaugeAddress: string): Promise<GaugeInfo>  {
        const crvToken = await gSwissKnife.syncUpTokenDB(Config.crv)
        const gaugeInfo: GaugeInfo = {
            address: '',
            relativeWeight: '',
            rewards: [],
        };
        gaugeInfo.address = gaugeAddress;
        const rewards: Reward[] = [];
        const gauge = new ContractHelper(gaugeAddress, './ETH/Curve/gauge.json', Config.network)
        const inflationRate = await gauge.callReadMethod('inflation_rate')
        const relativeWeight = await this.gaugeController.callReadMethod('gauge_relative_weight', gaugeAddress)
        gaugeInfo.relativeWeight = relativeWeight

        const annualRewardTokens = crvToken.readableAmountFromBN(new BigNumber(inflationRate).multipliedBy(relativeWeight).multipliedBy(31536000 * 0.4))
        
        return gaugeInfo;
    };
}

const main = async () => {
    const pool = new FactoryPool(Config.pools.v2[0]); // hbtc: hbtc/wbtc
    const poolInfo = await pool.getPoolInfo();
    console.log(poolInfo)
};

main().catch((e) => {
    logger.error(e.message);
});

import { LoggerFactory } from '../../library/LoggerFactory';
import BigNumber from 'bignumber.js';
import { ContractHelper } from '../../library/contract.helper';
import { EVMDataType, SwissKnife } from '../../library/swiss.knife';
import { Config } from './Config';
import { ERC20Token } from '../../library/erc20.token';
import { CoinMarketcap } from '../../library/coinmarketcap';
import { Web3Factory } from '../../library/web3.factory';

type RewardInfo = {
    token: ERC20Token;
    annualRewards: string;
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
    fees: {
        pool: string;
        admin: string;
    };
    a: string;
    coins: Coin[];
    underlyingCoins: Coin[];
    TVL: string;
    gauge: GaugeInfo;
    APR: string;
};

type GaugeInfo = {
    address: string;
    relativeWeight: string;
    workingSupply: string;
    reward: RewardInfo;
};

const logger = LoggerFactory.getInstance().getLogger('FarmingPool');
const gSwissKnife = new SwissKnife(Config.network);
const gMulticallAddress = Web3Factory.getInstance().getMultiCallAddress(Config.network)

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
        this.gaugeController = new ContractHelper(Config.gaugeController, './ETH/Curve/gauge.controller.json', Config.network)
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
            gauge: null,
            fees: null,
            a: '',
            coins: [],
            underlyingCoins: [],
            TVL: '0',
            APR: '0%'
        }
        poolInfo.poolAddress = this.address
        const multicall = new ContractHelper(gMulticallAddress, './ETH/Curve/multicall.json', Config.network)

        //获取pool lp token地址
        const callData1 = this.registry.getCallData('get_pool_name', this.address)
        //获取pool lp token地址
        const callData2 = this.registry.getCallData('get_lp_token', this.address)
        //获取wrap coin和underlying coin的个数
        const callData3 = this.registry.getCallData('get_n_coins', this.address)
        //获取wrap coin地址列表
        const callData4 = this.registry.getCallData('get_coins', this.address)
        //获取underlying coin的地址列表
        const callData5 = this.registry.getCallData('get_underlying_coins', this.address)
        //获取wrap coin余额
        const callData6 = this.registry.getCallData('get_balances', this.address)
        //获取underlying coin余额
        const callData7 = this.registry.getCallData('get_underlying_balances', this.address)
        //获取pool fee信息（swapFee/adminFee）
        const callData8 = this.registry.getCallData('get_fees', this.address)
        //获取A值
        const callData9 = this.registry.getCallData('get_A', this.address)
        //获取A值
        const callData10 = this.registry.getCallData('get_gauges', this.address)

        const inputs = [
            { target: Config.registry, callData: callData1 },
            { target: Config.registry, callData: callData2 },
            { target: Config.registry, callData: callData3 },
            { target: Config.registry, callData: callData4 },
            { target: Config.registry, callData: callData5 },
            { target: Config.registry, callData: callData6 },
            { target: Config.registry, callData: callData7 },
            { target: Config.registry, callData: callData8 },
            { target: Config.registry, callData: callData9 },
            { target: Config.registry, callData: callData10 },
        ]
        const datas = await multicall.callReadMethod('aggregate', inputs)
        console.log(datas)

        const poolName = gSwissKnife.decode(EVMDataType.STRING, datas['1'][0])
        poolInfo.poolName = poolName.toString()

        const lpTokenAddress = gSwissKnife.decode(EVMDataType.ADDRESS, datas['1'][1]).toString()
        const lpToken = await gSwissKnife.syncUpTokenDB(lpTokenAddress)
        poolInfo.lpToken = lpToken

        const numsOfcoins = gSwissKnife.decodeArray(['uint256', 'uint256'], datas['1'][2])
        const wCoins = gSwissKnife.decodeArray(['address', 'address'], datas['1'][3])
        const uCoins = gSwissKnife.decodeArray(['address', 'address'], datas['1'][4])
        const wCoinBalances = gSwissKnife.decodeArray(['uint256', 'uint256'], datas['1'][5])
        const uCoinBalances = gSwissKnife.decodeArray(['uint256', 'uint256'], datas['1'][6])
        const fees = gSwissKnife.decodeArray(['uint256', 'uint256'], datas['1'][7])
        const a = gSwissKnife.decode(EVMDataType.UINT256, datas['1'][8]).toString()
        const gaugeData = gSwissKnife.decodeArray(['address[10]', 'int128[10]'], datas['1'][9])
        logger.info(`getPoolInfo > gauge address: ${gaugeData[0][0]}`)

        poolInfo.fees = {
            pool: new BigNumber(fees[0]).dividedBy(1e10).multipliedBy(100).toNumber().toFixed(3) + '%',
            admin: new BigNumber(fees[1]).dividedBy(1e10).multipliedBy(100).toNumber().toFixed(3) + '%' // percentage of pool fee
        }
        poolInfo.a = a
        const gaugeInfo = await this.getGaugeInfo(gaugeData[0][0])
        poolInfo.gauge = gaugeInfo

        //获取wrap coins numbers
        const wCoinNumber = Number.parseInt(numsOfcoins[0])
        //获取underlying coins numbers
        const underlyingCoinNumber = Number.parseInt(numsOfcoins[1])

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

        let TVL = new BigNumber(0)
        //获取underlying coin的Token信息和余额  
        for (let i = 0; i < underlyingCoinNumber; i++) {
            const uCoinAddress = uCoins[i]
            const uCoin = await gSwissKnife.syncUpTokenDB(uCoinAddress)
            const uCoinBalance = uCoin.readableAmount(uCoinBalances[i]).toFixed(4)

            const uCoinPrice = await cmp.getTokenUSDPrice(uCoin.symbol)

            const uCoinUSDValue = new BigNumber(uCoinBalance).multipliedBy(uCoinPrice)
            TVL = TVL.plus(uCoinUSDValue)
            poolInfo.underlyingCoins.push({
                token: uCoin,
                amount: uCoinBalance
            })
        }
        poolInfo.TVL = TVL.toNumber().toFixed(4)

        const lptContract = new ContractHelper(lpTokenAddress, './erc20.json', Config.network)
        const totalSupplyOfLP = await lptContract.callReadMethod('totalSupply')

        const totalStakedUSD = TVL.multipliedBy(gaugeInfo.workingSupply).dividedBy(totalSupplyOfLP)

        const crvToken = await gSwissKnife.syncUpTokenDB(Config.crv)
        const crvPrice = await cmp.getTokenUSDPrice(crvToken.symbol)

        const aprBN = new BigNumber(gaugeInfo.reward.annualRewards).multipliedBy(crvPrice).dividedBy(totalStakedUSD)
        logger.info(`getPoolInfo > apr: ${aprBN.multipliedBy(100).toNumber().toFixed(4)}%`)
        poolInfo.APR = `${aprBN.multipliedBy(100).toNumber().toFixed(4)}%`

        return poolInfo
    }

    public async getGaugeInfo(gaugeAddress: string): Promise<GaugeInfo> {
        const crvToken = await gSwissKnife.syncUpTokenDB(Config.crv)
        const gaugeInfo: GaugeInfo = {
            address: '',
            relativeWeight: '',
            workingSupply: '',
            reward: null,
        };
        gaugeInfo.address = gaugeAddress

        const gauge = new ContractHelper(gaugeAddress, './ETH/Curve/gauge.json', Config.network)
        const inflationRate = await gauge.callReadMethod('inflation_rate')
        const relativeWeight = await this.gaugeController.callReadMethod('gauge_relative_weight', gaugeAddress)
        gaugeInfo.relativeWeight = relativeWeight

        const annualRewardTokens = new BigNumber(inflationRate).multipliedBy(relativeWeight).multipliedBy(31536000 * 0.4).dividedBy(1e36)

        gaugeInfo.reward = {
            token: crvToken,
            annualRewards: annualRewardTokens.toNumber().toFixed(4)
        }

        gaugeInfo.workingSupply = await gauge.callReadMethod('working_supply')
        return gaugeInfo;
    }

    public async getUserGaugeInfo(userAddress: string, gaugeAddress: string) {
        const gauge = new ContractHelper(gaugeAddress, './ETH/Curve/gauge.json', Config.network)
        const claimable_tokens = await gauge.callReadMethod('claimable_tokens', userAddress) // 待领取奖励CRV
        console.log(claimable_tokens)
    }

    /**
     * 获取实施兑换价格
     * @param poolAddress 池子合约地址
     * @param fromIndex   input token的coins数组下标
     * @param toIndex     output token的coins数组下标
     * @param fromAmountGWei input token的数量，最小单位1Gwei，eg. 1 = 1e18
     * @returns 兑换出的output token的数量
     */
    public static async getExchangePrice(poolAddress: string, fromIndex: number, toIndex: number, fromAmountGWei: number): Promise<number> {
        const abiJSONStr = `[
            {"name":"get_dy","outputs":[{"type":"uint256","name":""}],"inputs":[{"type":"int128","name":"i"},{"type":"int128","name":"j"},{"type":"uint256","name":"dx"}],"stateMutability":"view","type":"function","gas":2654541},
            {
                "name": "coins",
                "outputs": [{ "type": "address", "name": "" }],
                "inputs": [{ "type": "uint256", "name": "arg0" }],
                "stateMutability": "view",
                "type": "function"
            }
        ]`
        try {
            const pool = ContractHelper.getContractInstanceFromABI(poolAddress, abiJSONStr, Config.network)
            
            const inputTokenAddress = await pool.methods.coins(fromIndex).call()
            const inputToken = await gSwissKnife.syncUpTokenDB(inputTokenAddress)
            logger.info(`getExchangePrice > from coin[${fromIndex}]: ${inputToken.symbol}`)

            const outputTokenAddress = await pool.methods.coins(toIndex).call()
            const outputToken = await gSwissKnife.syncUpTokenDB(outputTokenAddress)
            logger.info(`getExchangePrice > to coin[${toIndex}]: ${outputToken.symbol}`)

            const outputAmount = await pool.methods.get_dy(fromIndex, toIndex, new BigNumber(fromAmountGWei).multipliedBy(Math.pow(10, inputToken.decimals))).call()
            
            const exchangeRatio = outputToken.readableAmount(outputAmount) / fromAmountGWei
            logger.info(`exchange ratio: ${exchangeRatio.toFixed(4)} ${outputToken.symbol}/${inputToken.symbol}`)
            logger.info(`getExchangePrice > swap ${fromAmountGWei} ${inputToken.symbol} to ${outputToken.readableAmount(outputAmount).toFixed(6)} ${outputToken.symbol}`)

            return outputToken.readableAmount(outputAmount)
        } catch(e) {
            logger.error(`getExchangePrice > ${e.toString()}`)
        }
    }
}

const cmp = CoinMarketcap.getInstance()

const main = async () => {
    const pool = new FactoryPool(Config.pools.v2[0]); // hbtc: hbtc/wbtc
    // const poolInfo = await pool.getPoolInfo();
    // console.log(poolInfo)
    //await pool.getUserGaugeInfo('0xb40c45b605171c6991171649d6b14852243ff156', '0x4c18E409Dc8619bFb6a1cB56D114C3f592E0aE79')

    await FactoryPool.getExchangePrice('0xdc24316b9ae028f1497c275eb9192a3ea0f67022', 1, 0, 17388)
    // const priceData = await cmp.getTokenUSDPrice('btc')
    // console.log(priceData)
};

main().catch((e) => {
    logger.error(e.message);
});

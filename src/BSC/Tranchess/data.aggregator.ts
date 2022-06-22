import { LoggerFactory } from '../../library/LoggerFactory';
import { SwissKnife } from '../../library/swiss.knife';
import { Config } from './Config';
import BigNumber from 'bignumber.js';
import { ethers, Contract } from 'ethers';
import axios, { AxiosResponse } from 'axios';

const { formatUnits } = ethers.utils
const logger = LoggerFactory.getInstance().getLogger('DataProviderHelper');
const swissKnife = new SwissKnife(Config.network);

const ABI =  [
    "constructor(address votingEscrow_, address chessSchedule_, address controllerBallot_, address interestRateBallot_, address swapRouter_, address flashSwapRouter_, address bishopQuoteToken_)",
    "function VERSION() view returns (string)",
    "function bishopQuoteToken() view returns (address)",
    "function chess() view returns (address)",
    "function chessSchedule() view returns (address)",
    "function controllerBallot() view returns (address)",
    "function flashSwapRouter() view returns (address)",
    "function getControllerBallotData(address account) view returns (tuple(address[] pools, uint256[] currentSums, tuple(uint256 amount, uint256 unlockTime, uint256[] weights) account) data)",
    "function getData(address[] primaryMarketRouters, address[] shareStakings, address[] feeDistributors, address[] externalSwaps, address account) view returns (tuple(uint256 blockNumber, uint256 blockTimestamp, tuple(tuple(bool isFundActive, uint256 fundActivityStartTime, uint256 activityDelayTimeAfterRebalance, uint256 currentDay, uint256 dailyProtocolFeeRate, uint256 totalSupplyQ, uint256 totalSupplyB, uint256 totalUnderlying, uint256 strategyUnderlying, uint256 rebalanceSize, uint256 upperRebalanceThreshold, uint256 lowerRebalanceThreshold, uint256 splitRatio, uint256 latestUnderlyingPrice, uint256 navB, uint256 navR, uint256 currentInterestRate, tuple(uint256 ratioB2Q, uint256 ratioR2Q, uint256 ratioBR, uint256 timestamp) lastRebalance) fund, tuple(uint256 fundCap, uint256 redemptionFeeRate, uint256 mergeFeeRate, uint256 redemptionQueueHead) primaryMarket, tuple(uint256 totalSupplyQ, uint256 totalSupplyB, uint256 totalSupplyR, uint256 weightedSupply, uint256 workingSupply, uint256 chessRate, tuple(uint256 balanceQ, uint256 balanceB, uint256 balanceR, uint256 weightedBalance, uint256 workingBalance, uint256 claimableChess) account) shareStaking, tuple(uint256 feeRate, uint256 adminFeeRate, uint256 ampl, uint256 currentD, uint256 currentPrice, uint256 baseBalance, uint256 quoteBalance, uint256 oraclePrice, uint256 lpTotalSupply, uint256 lpWorkingSupply, uint256 chessRate, uint256 lastDistributionQ, uint256 lastDistributionB, uint256 lastDistributionR, uint256 lastDistributionQuote, uint256 lastDistributionTotalSupply, address bonusToken, uint256 bonusRate, tuple(uint256 lpBalance, uint256 workingBalance, uint256 claimableChess, uint256 claimableBonus, uint256 claimableQ, uint256 claimableB, uint256 claimableR, uint256 claimableQuote) account) bishopStableSwap, tuple(uint256 feeRate, uint256 adminFeeRate, uint256 ampl, uint256 currentD, uint256 currentPrice, uint256 baseBalance, uint256 quoteBalance, uint256 oraclePrice, uint256 lpTotalSupply, uint256 lpWorkingSupply, uint256 chessRate, uint256 lastDistributionQ, uint256 lastDistributionB, uint256 lastDistributionR, uint256 lastDistributionQuote, uint256 lastDistributionTotalSupply, address bonusToken, uint256 bonusRate, tuple(uint256 lpBalance, uint256 workingBalance, uint256 claimableChess, uint256 claimableBonus, uint256 claimableQ, uint256 claimableB, uint256 claimableR, uint256 claimableQuote) account) queenStableSwap, tuple(tuple(uint256 underlying, uint256 quote, uint256 trancheQ, uint256 trancheB, uint256 trancheR) balance, tuple(uint256 primaryMarketRouterUnderlying, uint256 primaryMarketRouterTrancheQ, uint256 swapRouterUnderlying, uint256 swapRouterTrancheQ, uint256 swapRouterTrancheB, uint256 swapRouterQuote, uint256 flashSwapRouterTrancheR, uint256 flashSwapRouterQuote, uint256 shareStakingTrancheQ, uint256 shareStakingTrancheB, uint256 shareStakingTrancheR) allowance) account)[] funds, tuple(uint256 chessRate, uint256 nextWeekChessRate, tuple(uint256 totalLocked, uint256 totalSupply, uint256 tradingWeekTotalSupply, tuple(uint256 amount, uint256 unlockTime) account) votingEscrow, tuple(uint256 tradingWeekTotalSupply, tuple(uint256 amount, uint256 unlockTime, uint256 weight) account) interestRateBallot, tuple(address[] pools, uint256[] currentSums, tuple(uint256 amount, uint256 unlockTime, uint256[] weights) account) controllerBallot, tuple(tuple(uint256 nativeCurrency, uint256 chess) balance, tuple(uint256 votingEscrowChess) allowance) account) governance, tuple(uint256 currentRewards, uint256 currentSupply, uint256 tradingWeekTotalSupply, uint256 adminFeeRate, tuple(uint256 claimableRewards, uint256 currentBalance, uint256 amount, uint256 unlockTime) account)[] feeDistributors, tuple(string symbol0, string symbol1, uint112 reserve0, uint112 reserve1)[] externalSwaps) data)",
    "function getExternalSwapData(address router, address token0, address token1) view returns (tuple(string symbol0, string symbol1, uint112 reserve0, uint112 reserve1) data)",
    "function getFeeDistributorData(address feeDistributor, address account) returns (tuple(uint256 currentRewards, uint256 currentSupply, uint256 tradingWeekTotalSupply, uint256 adminFeeRate, tuple(uint256 claimableRewards, uint256 currentBalance, uint256 amount, uint256 unlockTime) account) data)",
    "function getFundAllData(address primaryMarketRouter, address shareStaking, address account) returns (tuple(tuple(bool isFundActive, uint256 fundActivityStartTime, uint256 activityDelayTimeAfterRebalance, uint256 currentDay, uint256 dailyProtocolFeeRate, uint256 totalSupplyQ, uint256 totalSupplyB, uint256 totalUnderlying, uint256 strategyUnderlying, uint256 rebalanceSize, uint256 upperRebalanceThreshold, uint256 lowerRebalanceThreshold, uint256 splitRatio, uint256 latestUnderlyingPrice, uint256 navB, uint256 navR, uint256 currentInterestRate, tuple(uint256 ratioB2Q, uint256 ratioR2Q, uint256 ratioBR, uint256 timestamp) lastRebalance) fund, tuple(uint256 fundCap, uint256 redemptionFeeRate, uint256 mergeFeeRate, uint256 redemptionQueueHead) primaryMarket, tuple(uint256 totalSupplyQ, uint256 totalSupplyB, uint256 totalSupplyR, uint256 weightedSupply, uint256 workingSupply, uint256 chessRate, tuple(uint256 balanceQ, uint256 balanceB, uint256 balanceR, uint256 weightedBalance, uint256 workingBalance, uint256 claimableChess) account) shareStaking, tuple(uint256 feeRate, uint256 adminFeeRate, uint256 ampl, uint256 currentD, uint256 currentPrice, uint256 baseBalance, uint256 quoteBalance, uint256 oraclePrice, uint256 lpTotalSupply, uint256 lpWorkingSupply, uint256 chessRate, uint256 lastDistributionQ, uint256 lastDistributionB, uint256 lastDistributionR, uint256 lastDistributionQuote, uint256 lastDistributionTotalSupply, address bonusToken, uint256 bonusRate, tuple(uint256 lpBalance, uint256 workingBalance, uint256 claimableChess, uint256 claimableBonus, uint256 claimableQ, uint256 claimableB, uint256 claimableR, uint256 claimableQuote) account) bishopStableSwap, tuple(uint256 feeRate, uint256 adminFeeRate, uint256 ampl, uint256 currentD, uint256 currentPrice, uint256 baseBalance, uint256 quoteBalance, uint256 oraclePrice, uint256 lpTotalSupply, uint256 lpWorkingSupply, uint256 chessRate, uint256 lastDistributionQ, uint256 lastDistributionB, uint256 lastDistributionR, uint256 lastDistributionQuote, uint256 lastDistributionTotalSupply, address bonusToken, uint256 bonusRate, tuple(uint256 lpBalance, uint256 workingBalance, uint256 claimableChess, uint256 claimableBonus, uint256 claimableQ, uint256 claimableB, uint256 claimableR, uint256 claimableQuote) account) queenStableSwap, tuple(tuple(uint256 underlying, uint256 quote, uint256 trancheQ, uint256 trancheB, uint256 trancheR) balance, tuple(uint256 primaryMarketRouterUnderlying, uint256 primaryMarketRouterTrancheQ, uint256 swapRouterUnderlying, uint256 swapRouterTrancheQ, uint256 swapRouterTrancheB, uint256 swapRouterQuote, uint256 flashSwapRouterTrancheR, uint256 flashSwapRouterQuote, uint256 shareStakingTrancheQ, uint256 shareStakingTrancheB, uint256 shareStakingTrancheR) allowance) account) data)",
    "function getFundData(address fund) view returns (tuple(bool isFundActive, uint256 fundActivityStartTime, uint256 activityDelayTimeAfterRebalance, uint256 currentDay, uint256 dailyProtocolFeeRate, uint256 totalSupplyQ, uint256 totalSupplyB, uint256 totalUnderlying, uint256 strategyUnderlying, uint256 rebalanceSize, uint256 upperRebalanceThreshold, uint256 lowerRebalanceThreshold, uint256 splitRatio, uint256 latestUnderlyingPrice, uint256 navB, uint256 navR, uint256 currentInterestRate, tuple(uint256 ratioB2Q, uint256 ratioR2Q, uint256 ratioBR, uint256 timestamp) lastRebalance) data)",
    "function getGovernanceData(address account) view returns (tuple(uint256 chessRate, uint256 nextWeekChessRate, tuple(uint256 totalLocked, uint256 totalSupply, uint256 tradingWeekTotalSupply, tuple(uint256 amount, uint256 unlockTime) account) votingEscrow, tuple(uint256 tradingWeekTotalSupply, tuple(uint256 amount, uint256 unlockTime, uint256 weight) account) interestRateBallot, tuple(address[] pools, uint256[] currentSums, tuple(uint256 amount, uint256 unlockTime, uint256[] weights) account) controllerBallot, tuple(tuple(uint256 nativeCurrency, uint256 chess) balance, tuple(uint256 votingEscrowChess) allowance) account) data)",
    "function getLatestPrice(address twapOracle) view returns (uint256)",
    "function getPrimaryMarketData(address primaryMarket) view returns (tuple(uint256 fundCap, uint256 redemptionFeeRate, uint256 mergeFeeRate, uint256 redemptionQueueHead) data)",
    "function getShareStakingData(address shareStaking, uint256 splitRatio, address account) returns (tuple(uint256 totalSupplyQ, uint256 totalSupplyB, uint256 totalSupplyR, uint256 weightedSupply, uint256 workingSupply, uint256 chessRate, tuple(uint256 balanceQ, uint256 balanceB, uint256 balanceR, uint256 weightedBalance, uint256 workingBalance, uint256 claimableChess) account) data)",
    "function getStableSwapData(address stableSwap, address account) returns (tuple(uint256 feeRate, uint256 adminFeeRate, uint256 ampl, uint256 currentD, uint256 currentPrice, uint256 baseBalance, uint256 quoteBalance, uint256 oraclePrice, uint256 lpTotalSupply, uint256 lpWorkingSupply, uint256 chessRate, uint256 lastDistributionQ, uint256 lastDistributionB, uint256 lastDistributionR, uint256 lastDistributionQuote, uint256 lastDistributionTotalSupply, address bonusToken, uint256 bonusRate, tuple(uint256 lpBalance, uint256 workingBalance, uint256 claimableChess, uint256 claimableBonus, uint256 claimableQ, uint256 claimableB, uint256 claimableR, uint256 claimableQuote) account) data)",
    "function interestRateBallot() view returns (address)",
    "function swapRouter() view returns (address)",
    "function votingEscrow() view returns (address)"
]
/**
 * abi格式转换
 * 文档： https://docs.ethers.io/v5/api/utils/abi/formats/#abi-formats--converting-between-formats
 * 
 * 获取基金列表： https://tranchess.com/api/v3/funds
 * 
 * 
 * */
// const readableInterface = new ethers.utils.Interface(ABI);
// const jsonAbi = readableInterface.format(ethers.utils.FormatTypes.json);
// console.log(JSON.stringify(jsonAbi));

const Provider = new ethers.providers.JsonRpcProvider('https://bscrpc.com');

export class DataAggregator {
    public readonly address: string;
    private itself: Contract;

    private static instance: DataAggregator;

    private constructor(address: string) {
        this.itself = new ethers.Contract(address, ABI, Provider);
        this.itself.interface;
    }

    static getInstance(address: string) {
        if (!DataAggregator.instance) {
            DataAggregator.instance = new DataAggregator(address);
        }
        return DataAggregator.instance;
    }

    public async getFunds() {
        const fundItems = [];
        const res = await axios.get('https://tranchess.com/api/v3/funds', {});
        logger.debug(`http status: ${res.status}`);
        if (res.status === 200) {
            //console.log(res.data);
            for(const item of res.data) {
                fundItems.push({
                    name: item.name,
                        addresses: {
                            fund: item['fundAddress'],
                            primaryMarket: item['primaryMarket']['address'],
                            primaryMarketRouter: item['primaryMarketRouterAddress'],
                            bishopStableSwap: item['bishopSwap']['address'],
                            bishopLiquidityGauge: item['bishopSwap']['lpToken']['address'],
                            queenStableSwap: item['queenSwap']['address'],
                            queenLiquidityGauge: item['queenSwap']['lpToken']['address'],
                            shareStaking: item['shareStakingAddress'],
                            twapOracle: item['twapOracleAddress'],
                            upgradeTool: item['upgradeToolAddress']
                        },
                        assets: {
                            underlyingToken: item['underlyingToken'],
                            quoteToken: item['bishopSwap.quoteToken'],
                            trancheQ: item['trancheQ'],
                            trancheB: item['trancheB'],
                            trancheR: item['trancheR'],
                            bishopLpToken: item['bishopSwap']['lpToken'],
                            queenLpToken: item['queenSwap']['lpToken']
                        },
                        dailyProtocolFeeRate: formatUnits(item['dailyProtocolFeeRate']),
                        baseInterestRate: formatUnits(item['baseInterestRate']),
                        floatingInterestRate: formatUnits(item['floatingInterestRate']),
                        weeklyAveragePnlPercentage: formatUnits(item['weeklyAveragePnlPercentage'])
                })
            }
            console.log(fundItems)
            return fundItems
        }
    }
    public async getData() {
        let configData = Config.v2.BNBFund;

        try {
            const data = await this.itself.getFundData(
              '0x7618f37EfE8930d5EE6da34185b3AbB750BD2a34'
            );
            console.log(data)
        } catch (e) {
            logger.error(`testProtocolData > ${e.message}`)
        }
    }


}

const contracts = [
    '0xc67428c43238c18a1a588d5429283ade3d98fe76'
]
// const userAddress = '0xD2050719eA37325BdB6c18a85F6c442221811FAC';
const userAddress = '0x881897b1FC551240bA6e2CAbC7E59034Af58428a';



const main = async () => {
    
        const dataProvider = DataAggregator.getInstance('0xc67428C43238c18a1a588d5429283AdE3D98Fe76');
        await dataProvider.getData();
    
};

main().catch((e) => {
    logger.error(e.message);
});

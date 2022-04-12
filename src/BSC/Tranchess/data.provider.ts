import { LoggerFactory } from '../../library/LoggerFactory';
import { SwissKnife } from '../../library/swiss.knife';
import { Config } from './Config';
import BigNumber from 'bignumber.js';
import { ethers, Contract } from 'ethers';
import moment from 'moment';
import { FundCategroy, ExchangeInfo, ProtocalDataInfo, FundInfo, GovernanceInfo, APRInfo } from './data.type';
import { TrancheChef } from './tranche.chef';

const logger = LoggerFactory.getInstance().getLogger('DataProviderHelper');
const swissKnife = new SwissKnife(Config.network);

const ABI = [
    `function getProtocolData (address primaryMarketAddress, address exchangeAddress, address pancakePairAddress, address feeDistributorAddress, address account, uint256 fundVersion) view returns (
        tuple (
            uint256 blockNumber, 
            uint256 blockTimestamp, 
            tuple (
                tuple (
                    uint256 nativeCurrency, 
                    uint256 underlyingToken, 
                    uint256 quoteToken, 
                    uint256 tokenM, 
                    uint256 tokenA, 
                    uint256 tokenB, 
                    uint256 chess
                ) balance, 
                tuple (
                    uint256 primaryMarketUnderlying, 
                    tuple (
                        uint256 quoteToken, 
                        uint256 tokenM, 
                        uint256 tokenA, 
                        uint256 tokenB
                    ) exchange, 
                    uint256 votingEscrowChess
                ) allowance
            ) wallet, 
            tuple (
                bool isFundActive, 
                bool isPrimaryMarketActive, 
                bool isExchangeActive, 
                uint256 fundActivityStartTime, 
                uint256 exchangeActivityStartTime, 
                uint256 currentDay, 
                uint256 currentWeek, 
                uint256 dailyProtocolFeeRate, 
                uint256 totalShares, 
                uint256 totalUnderlying, 
                uint256 rebalanceSize, 
                uint256 currentInterestRate, 
                tuple (
                    uint256 ratioM, 
                    uint256 ratioA2M, 
                    uint256 ratioB2M, 
                    uint256 ratioAB, 
                    uint256 timestamp
                ) lastRebalance, 
                uint256 relativeWeight, 
                uint256 strategyUnderlying
            ) fund, 
            tuple (
                uint256 currentCreatingUnderlying, 
                uint256 currentRedeemingShares, 
                uint256 fundCap, 
                uint256 redemptionFeeRate, 
                uint256 splitFeeRate, 
                uint256 mergeFeeRate, 
                uint256 minCreationUnderlying, 
                tuple (
                    uint256 creatingUnderlying, 
                    uint256 redeemingShares, 
                    uint256 createdShares, 
                    uint256 redeemedUnderlying, 
                    uint256[16] recentDelayedRedemptions
                ) account
            ) primaryMarket, 
            tuple (
                tuple (
                    uint256 tokenM, 
                    uint256 tokenA, 
                    uint256 tokenB
                ) totalDeposited, 
                uint256 weightedSupply, 
                uint256 workingSupply, 
                uint256 minBidAmount, 
                uint256 minAskAmount,
                tuple (
                    tuple (
                        uint256 tokenM, 
                        uint256 tokenA, 
                        uint256 tokenB
                    ) available, 
                    tuple (
                        uint256 tokenM, 
                        uint256 tokenA, 
                        uint256 tokenB
                    ) locked, 
                    uint256 weightedBalance, 
                    uint256 workingBalance, 
                    tuple (
                        uint256 veProportion, 
                        tuple (
                            uint256 amount, 
                            uint256 unlockTime
                        ) veLocked
                    ) veSnapshot, 
                    bool isMaker, 
                    uint256 chessRewards
                ) account
            ) exchange, 
            tuple (
                uint256 chessTotalSupply, 
                uint256 chessRate, 
                uint256 nextWeekChessRate, 
                tuple (
                    uint256 totalLocked, 
                    uint256 totalSupply, 
                    uint256 tradingWeekTotalSupply, 
                    tuple (
                        uint256 amount, 
                        uint256 unlockTime
                    ) account
                ) votingEscrow, 
                tuple (
                    uint256 tradingWeekTotalSupply, 
                    tuple (
                        uint256 amount, 
                        uint256 unlockTime, 
                        uint256 weight
                    ) account
                ) interestRateBallot, 
                tuple (
                    address[] pools, 
                    uint256[] currentSums, 
                    tuple (
                        uint256 amount, 
                        uint256 unlockTime, 
                        uint256[] weights
                    ) account
                ) controllerBallot, 
                tuple (
                    tuple (
                        uint256 claimableRewards, 
                        uint256 currentBalance, 
                        uint256 amount, 
                        uint256 unlockTime
                    ) account, 
                    uint256 currentRewards, 
                    uint256 currentSupply, 
                    uint256 tradingWeekTotalSupply, 
                    uint256 adminFeeRate
                ) feeDistributor
            ) governance, 
            tuple (
                uint112 reserve0, 
                uint112 reserve1, 
                address token0, 
                address token1
            ) pair
        ) data
    )`,
    `function getUnsettledTrades (address exchangeAddress, address account, uint256[] epochs) view returns (
        tuple[] (
            tuple(uint256 frozenQuote, uint256 effectiveQuote, uint256 reservedBase) takerBuy,
            tuple(uint256 frozenBase, uint256 effectiveBase, uint256 reservedQuote) takerSell,
            tuple(uint256 frozenBase, uint256 effectiveBase, uint256 reservedQuote) makerBuy,
            tuple(uint256 frozenQuote, uint256 effectiveQuote, uint256 reservedBase) makerSell
        ) unsettledTradeM,
        tuple[] (
            tuple(uint256 frozenQuote, uint256 effectiveQuote, uint256 reservedBase) takerBuy,
            tuple(uint256 frozenBase, uint256 effectiveBase, uint256 reservedQuote) takerSell,
            tuple(uint256 frozenBase, uint256 effectiveBase, uint256 reservedQuote) makerBuy,
            tuple(uint256 frozenQuote, uint256 effectiveQuote, uint256 reservedBase) makerSell
        ) unsettledTradeA,
        tuple[] (
            tuple(uint256 frozenQuote, uint256 effectiveQuote, uint256 reservedBase) takerBuy,
            tuple(uint256 frozenBase, uint256 effectiveBase, uint256 reservedQuote) takerSell,
            tuple(uint256 frozenBase, uint256 effectiveBase, uint256 reservedQuote) makerBuy,
            tuple(uint256 frozenQuote, uint256 effectiveQuote, uint256 reservedBase) makerSell
        ) unsettledTradeB
    )`,
];

const Provider = new ethers.providers.JsonRpcProvider('https://bsc-dataseed.binance.org');

export class DataProviderHelper {
    public readonly address: string;
    private itself: Contract;

    private static instance: DataProviderHelper;

    private constructor() {
        this.itself = new ethers.Contract(Config.dataProvider, ABI, Provider);
    }

    static getInstance() {
        if (!DataProviderHelper.instance) {
            DataProviderHelper.instance = new DataProviderHelper();
        }
        return DataProviderHelper.instance;
    }

    public async getProtocolData(fundCategory: FundCategroy, userAddress: string): Promise<ProtocalDataInfo> {
        let configData;
        switch (fundCategory) {
            case FundCategroy.BTCFund:
                configData = Config.BTCFund;
                break;
            case FundCategroy.ETHFund:
                configData = Config.ETHFund;
                break;
            case FundCategroy.BNBFund:
                configData = Config.BNBFund;
                break;
        }

        const chef = TrancheChef.getInstance(fundCategory);

        const chessToken = await swissKnife.syncUpTokenDB(Config.chessToken);
        const tokenM = await swissKnife.syncUpTokenDB(configData['tokens'][0]);
        const tokenA = await swissKnife.syncUpTokenDB(configData['tokens'][1]);
        const tokenB = await swissKnife.syncUpTokenDB(configData['tokens'][2]);

        const data = await this.itself.getProtocolData(
            configData['primaryMarket'],
            configData['exchange'],
            configData['pancakePair'],
            configData['feeDistributor'],
            userAddress,
            0,
        );

        const exchangeInfo: ExchangeInfo = {
            totalDeposited: {
                tokenM: {
                    token: undefined,
                    balance: '',
                },
                tokenA: {
                    token: undefined,
                    balance: '',
                },
                tokenB: {
                    token: undefined,
                    balance: '',
                },
            },
            weightedSupply: '',
            workingSupply: '',
            minBidAmount: '',
            minAskAmount: '',
            account: {
                available: {
                    tokenM: {
                        token: undefined,
                        balance: '',
                    },
                    tokenA: {
                        token: undefined,
                        balance: '',
                    },
                    tokenB: {
                        token: undefined,
                        balance: '',
                    },
                },
                locked: {
                    tokenM: {
                        token: undefined,
                        balance: '',
                    },
                    tokenA: {
                        token: undefined,
                        balance: '',
                    },
                    tokenB: {
                        token: undefined,
                        balance: '',
                    },
                },
                weightedBalance: '',
                workingBalance: '',
                veSnapshot: {
                    veProportion: '',
                    veChessAmount: '',
                    veLocked: {
                        token: undefined,
                        amount: '',
                        unlockTime: '',
                    },
                },
                isMaker: false,
                chessRewards: {
                    token: undefined,
                    balance: '',
                },
            },
        };
        exchangeInfo.totalDeposited.tokenM = {
            token: tokenM,
            balance: data['exchange']['totalDeposited']['tokenM'].toString(),
        };
        exchangeInfo.totalDeposited.tokenA = {
            token: tokenA,
            balance: data['exchange']['totalDeposited']['tokenA'].toString(),
        };
        exchangeInfo.totalDeposited.tokenB = {
            token: tokenB,
            balance: data['exchange']['totalDeposited']['tokenB'].toString(),
        };
        exchangeInfo.weightedSupply = data['exchange']['weightedSupply'].toString();
        exchangeInfo.workingSupply = data['exchange']['workingSupply'].toString();
        exchangeInfo.minAskAmount = data['exchange']['minAskAmount'].toString();
        exchangeInfo.minBidAmount = data['exchange']['minBidAmount'].toString();

        exchangeInfo.account.available.tokenM = {
            token: tokenM,
            balance: data['exchange']['account']['available']['tokenM'].toString(),
        };
        exchangeInfo.account.available.tokenA = {
            token: tokenA,
            balance: data['exchange']['account']['available']['tokenA'].toString(),
        };
        exchangeInfo.account.available.tokenB = {
            token: tokenB,
            balance: data['exchange']['account']['available']['tokenB'].toString(),
        };
        //locked
        exchangeInfo.account.locked.tokenM = {
            token: tokenM,
            balance: data['exchange']['account']['locked']['tokenM'].toString(),
        };
        exchangeInfo.account.locked.tokenA = {
            token: tokenA,
            balance: data['exchange']['account']['locked']['tokenA'].toString(),
        };
        exchangeInfo.account.locked.tokenB = {
            token: tokenB,
            balance: data['exchange']['account']['locked']['tokenB'].toString(),
        };

        exchangeInfo.account.weightedBalance = data['exchange']['account']['weightedBalance'].toString();
        exchangeInfo.account.workingBalance = data['exchange']['account']['workingBalance'].toString();

        exchangeInfo.account.veSnapshot.veProportion = data['exchange']['account']['veSnapshot'][
            'veProportion'
        ].toString();
        exchangeInfo.account.veSnapshot.veLocked = {
            token: chessToken,
            amount: data['exchange']['account']['veSnapshot']['veLocked']['amount'].toString(),
            unlockTime: data['exchange']['account']['veSnapshot']['veLocked']['unlockTime'].toString(),
        };
        exchangeInfo.account.veSnapshot.veChessAmount = this.getVotingPowerAtTimestamp({
            lockedChessAmount: exchangeInfo.account.veSnapshot.veLocked.amount,
            unlockTimestamp: Number.parseInt(exchangeInfo.account.veSnapshot.veLocked.unlockTime) * 1000,
        });

        exchangeInfo.account.isMaker = data['exchange']['account']['isMaker'];
        exchangeInfo.account.chessRewards = {
            token: chessToken,
            balance: data['exchange']['account']['chessRewards'].toString(),
        };

        const fundInfo: FundInfo = {
            currentDay: data['fund']['currentDay'].toString(),
            currentWeek: data['fund']['currentWeek'].toString(),
            totalShares: data['fund']['totalShares'].toString(),
            currentInterestRate: data['fund']['currentInterestRate'].toString(),
            relativeWeight: data['fund']['relativeWeight'].toString(),
        };

        const governInfo: GovernanceInfo = {
            chessTotalSupply: {
                token: chessToken,
                balance: data['governance']['chessTotalSupply'].toString(),
            },
            chessRate: data['governance']['chessRate'].toString(),
            nextWeekChessRate: data['governance']['nextWeekChessRate'].toString(),
            votingEscrow: {
                totalSupply: data['governance']['votingEscrow']['totalSupply'].toString(),
                totalLocked: data['governance']['votingEscrow']['totalLocked'].toString(),
                tradingWeekTotalSupply: data['governance']['votingEscrow']['tradingWeekTotalSupply'].toString(),
                account: {
                    amount: data['governance']['votingEscrow']['account']['amount'].toString(),
                    unlockTime: data['governance']['votingEscrow']['account']['unlockTime'].toString(),
                },
            },
        };
        const prices = await chef.getPrices();

        const baseDailyReward = new BigNumber(governInfo.chessRate)
            .multipliedBy(3600 * 24)
            .multipliedBy(Config.chessPrice)
            .multipliedBy(fundInfo.relativeWeight)
            .dividedBy(1e36);

        const trancheMFund = new BigNumber(exchangeInfo.workingSupply).multipliedBy(prices[0]).dividedBy(1e36);
        const aprM = baseDailyReward
            .multipliedBy(Config.rewardWeight.M)
            .multipliedBy(365)
            .dividedBy(trancheMFund)
            .dividedBy(Config.rewardWeight.M);
        const maxAPRM = aprM.multipliedBy(3);
        logger.info(`Tranche M - Queen apr: ${aprM.toNumber().toFixed(4)} ~ ${maxAPRM.toNumber().toFixed(4)}`);

        const trancheBFund = new BigNumber(exchangeInfo.workingSupply).multipliedBy(prices[2]).dividedBy(1e36);
        const aprB = baseDailyReward
            .multipliedBy(Config.rewardWeight.B)
            .multipliedBy(365)
            .dividedBy(trancheBFund)
            .dividedBy(Config.rewardWeight.M);
        const maxAPRB = aprB.multipliedBy(3);
        logger.info(`Tranche B - Rook apr: ${aprB.toNumber().toFixed(4)} ~ ${maxAPRB.toNumber().toFixed(4)}`);

        const trancheAFund = new BigNumber(exchangeInfo.workingSupply).multipliedBy(prices[1]).dividedBy(1e36);
        const aprA = baseDailyReward
            .multipliedBy(Config.rewardWeight.A)
            .multipliedBy(365)
            .dividedBy(trancheAFund)
            .dividedBy(Config.rewardWeight.M);
        const maxAPRA = aprA.multipliedBy(3);
        logger.info(`Tranche A - Bishop apr: ${aprA.toNumber().toFixed(4)} ~ ${maxAPRA.toNumber().toFixed(4)}`);

        const boostedFactor = this.getBoostingFactorByVeProportion({
            weightedSupply: exchangeInfo.weightedSupply,
            workingSupply: exchangeInfo.workingSupply,
            mAmount: exchangeInfo.account.available.tokenM.balance,
            aAmount: exchangeInfo.account.available.tokenA.balance,
            bAmount: exchangeInfo.account.available.tokenB.balance,
            workingBalance: exchangeInfo.account.workingBalance,
            veProportion: new BigNumber(exchangeInfo.account.veSnapshot.veProportion).dividedBy(1e18).toNumber(),
        });

        const aprInfo: APRInfo = {
            tokenM: {
                token: tokenM,
                min: aprM.toNumber().toFixed(4),
                max: maxAPRM.toNumber().toFixed(4),
            },
            tokenA: {
                token: tokenA,
                min: aprA.toNumber().toFixed(4),
                max: maxAPRA.toNumber().toFixed(4),
            },
            tokenB: {
                token: tokenB,
                min: aprB.toNumber().toFixed(4),
                max: maxAPRB.toNumber().toFixed(4),
            },
            boostedFactor: Number.parseFloat(boostedFactor),
        };

        return {
            fund: fundInfo,
            exchange: exchangeInfo,
            apr: aprInfo,
            governance: governInfo,
        };
    }

    public getWeightedBalance = ({ mAmount = '', aAmount = '', bAmount = '' }): string => {
        const weightedBalance = new BigNumber(mAmount || 0)
            .times(Config.rewardWeight.M)
            .plus(new BigNumber(aAmount || 0).times(Config.rewardWeight.A))
            .plus(new BigNumber(bAmount || 0).times(Config.rewardWeight.B))
            .div(Config.rewardWeight.M);
        return weightedBalance.toString();
    };

    public getWorkingBalance = ({
        weightedSupply = '',
        mAmount = '',
        aAmount = '',
        bAmount = '',
        veProportion = 0,
    }) => {
        const result = {
            workingAB: null,
            workingM: null,
            total: null,
        };
        const boostingPower = new BigNumber(weightedSupply || 0).times(veProportion);
        const weightedM = this.getWeightedBalance({
            mAmount,
            aAmount: '0',
            bAmount: '0',
        });
        const weightedAB = this.getWeightedBalance({
            mAmount: '0',
            aAmount,
            bAmount,
        });
        const workingAB = BigNumber.min(
            new BigNumber(weightedAB).plus(boostingPower.times(new BigNumber(3).minus(1))),
            new BigNumber(weightedAB).times(3),
        );

        const workingM = BigNumber.min(
            new BigNumber(weightedM).plus(
                BigNumber.min(BigNumber.max(0, boostingPower.minus(weightedAB)), boostingPower.div(2)).times(
                    new BigNumber(3).minus(1),
                ),
            ),
            new BigNumber(weightedM).times(3),
        );
        result.workingAB = workingAB.toString();
        result.workingM = workingM.toString();
        result.total = workingAB.plus(workingM).toString();
        return result;
    };

    public getBoostingFactor = ({
        workingSupply = '',
        mAmount = '',
        aAmount = '',
        bAmount = '',
        workingBalance = '',
    }) => {
        const weightedBalance = this.getWeightedBalance({ mAmount, aAmount, bAmount });
        let boostingFactor = new BigNumber(1);
        if (Number(workingSupply) > 0 && Number(workingBalance) > 0 && Number(weightedBalance) > 0) {
            boostingFactor = new BigNumber(workingBalance)
                .div(workingSupply)
                .div(
                    new BigNumber(weightedBalance).div(
                        new BigNumber(workingSupply).minus(workingBalance).plus(weightedBalance),
                    ),
                );
        }
        return boostingFactor.toString();
    };

    public getBoostingFactorByVeProportion = ({
        weightedSupply = '',
        workingSupply = '',
        mAmount = '',
        aAmount = '',
        bAmount = '',
        workingBalance = '',
        veProportion = 0,
    }) => {
        const newWorkingBalance = this.getWorkingBalance({ weightedSupply, mAmount, aAmount, bAmount, veProportion });
        const newWorkingSupply = new BigNumber(workingSupply || 0)
            .minus(workingBalance || 0)
            .plus(newWorkingBalance.total || 0)
            .toString();
        return this.getBoostingFactor({
            workingSupply: newWorkingSupply,
            mAmount,
            aAmount,
            bAmount,
            workingBalance: newWorkingBalance.total,
        });
    };
    /**
     * getVotingPowerAtTimestamp 获取锁定chess获得的voting power
     * @param lockedChessAmount 锁定的chess token的数量
     * @param unlockTimestamp   解锁时间 millionseconds
     * @param timestamp         时间戳  millionseconds
     * @returns 
     */
    public getVotingPowerAtTimestamp = ({ lockedChessAmount = '', unlockTimestamp = 0, timestamp = 0 }) => {
        const atMoment = timestamp == 0 ? moment().unix() : moment(timestamp).unix()
        const timeDiffInSecond = moment(unlockTimestamp).unix() - atMoment;
        logger.info(`getVotingPowerAtTimestamp > timeDiffInSecond : ${timeDiffInSecond}`)
        const votingPower = new BigNumber(lockedChessAmount)
            .multipliedBy(Math.max(timeDiffInSecond, 0))
            .dividedBy(Config.VOTING_ESCORW_MAX_TIME);
            logger.info(`getVotingPowerAtTimestamp > votingPower : ${votingPower}`)    
        return votingPower.toNumber().toFixed(4);
    };
}

// const userAddress = '0xD2050719eA37325BdB6c18a85F6c442221811FAC';
const userAddress = '0x881897b1FC551240bA6e2CAbC7E59034Af58428a';
const dataProvider = DataProviderHelper.getInstance();

const main = async () => {
    const data = await dataProvider.getProtocolData(FundCategroy.BNBFund, userAddress);
    console.log(JSON.stringify(data));

    // const bAPR = dataProvider.getBoostingFactorByVeProportion(
    //     data.exchange.weightedSupply,
    //     data.exchange.workingSupply,
    //     data.exchange.account.available.tokenM.balance,
    //     data.exchange.account.available.tokenA.balance,
    //     data.exchange.account.available.tokenB.balance,
    //     data.exchange.account.workingBalance,
    //     new BigNumber(data.exchange.account.veSnapshot.veProportion).dividedBy(1e18).toNumber());
    // console.log(bAPR);
};

main().catch((e) => {
    logger.error(e.message);
});

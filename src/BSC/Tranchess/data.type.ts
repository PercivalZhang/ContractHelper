import { ERC20Token } from '../../library/erc20.token';

export enum FundCategroy {
    BTCFund,
    ETHFund,
    BNBFund,
}

type TokenInfo = {
    token: ERC20Token;
    balance: string;
};

export type ExchangeInfo = {
    totalDeposited: {
        tokenM: TokenInfo,
        tokenA: TokenInfo,
        tokenB: TokenInfo,
    },
    weightedSupply: string,
    workingSupply: string,
    minBidAmount: string,
    minAskAmount: string,
    account: {
        available: {
            tokenM: TokenInfo,
            tokenA: TokenInfo,
            tokenB: TokenInfo,
        },
        locked: {
            tokenM: TokenInfo,
            tokenA: TokenInfo,
            tokenB: TokenInfo,
        },
        weightedBalance: string,
        workingBalance: string,
        veSnapshot: {
            veProportion: string,
            veChessAmount: string,
            veLocked: {
                token: ERC20Token,
                amount: string,
                unlockTime: string
            }
        },
        isMaker: boolean,
        chessRewards: TokenInfo
    }
}

export type FundInfo = {
    currentDay: string,
    currentWeek: string,
    totalShares: string,
    currentInterestRate: string,
    relativeWeight: string
}

export type APRInfo = {
    tokenM: {
        token: ERC20Token,
        min: string,
        max: string
    }
    tokenA: {
        token: ERC20Token,
        min: string,
        max: string
    }
    tokenB: {
        token: ERC20Token,
        min: string,
        max: string
    }
    boostedFactor: number
}

export type GovernanceInfo = {
    chessTotalSupply: TokenInfo,
    chessRate: string,
    nextWeekChessRate: string,
    votingEscrow: {
        totalLocked: string,
        totalSupply: string,
        tradingWeekTotalSupply: string,
        account: {
            amount: string,
            unlockTime: string
        }
    }
}

export type ProtocalDataInfo = {
    exchange: ExchangeInfo,
    fund: FundInfo,
    apr: APRInfo,
    governance: GovernanceInfo
}

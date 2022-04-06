import { LoggerFactory } from '../../library/LoggerFactory';
import BigNumber from 'bignumber.js';
import { ContractHelper } from '../../library/contract.helper';
import { SwissKnife } from '../../library/swiss.knife';
import { Config } from './Config';
import { ERC20Token } from '../../library/erc20.token';
import { TWAPOracle } from './twap.oracle';

type TokenBalance = {
    token: ERC20Token;
    balance: number;
};

// export enum NetworkType {
//     Queen,
//     Bishop,
//     Rook
// }

const logger = LoggerFactory.getInstance().getLogger('ExchangePlusStake');
const swissKnife = new SwissKnife(Config.network);

export class ExchangePlusStake {
    public readonly address: string;
    private cHelper: ContractHelper;
    private hideExceptionOutput: boolean;

    constructor(address: string) {
        this.cHelper = new ContractHelper(address, './BSC/Tranchess/exchange.v2.json', Config.network);
        this.address = address;
        this.hideExceptionOutput = false;
    }

    public toggleHiddenExceptionOutput() {
        this.hideExceptionOutput = !this.hideExceptionOutput;
    }

    public async getUserInfo(userAddress: string) {
        let isStaked = false;
        for(let i = 0; i < 3; i++) {
            const tokenBalance = await this.cHelper.callReadMethod('availableBalanceOf', i, userAddress);
            if(new BigNumber(tokenBalance).gt(0)) {
                isStaked = true;
                const queenToken = await swissKnife.syncUpTokenDB(Config.BTCFund.tokens[i]);
                logger.info(`token - ${queenToken.symbol} balance: ${queenToken.readableAmount(tokenBalance).toFixed(6)}`);
            }
        }
        if(isStaked) {
           const pendingRewards =  await this.cHelper.callReadMethod('claimableRewards', userAddress);
           const rewardToken = await swissKnife.syncUpTokenDB(Config.chessToken);
           logger.info(`pending reward - ${rewardToken.symbol} balance: ${rewardToken.readableAmount(pendingRewards).toFixed(6)}`);
        }
    }

    public async getPrice(timestamp) {
        const priceData = await this.cHelper.callReadMethod('estimateNavs', timestamp);
        console.log(priceData)
    }
    
}

const main = async () => {
    /**
     * TRANCHE_M = 0 // Token - Queen
     * TRANCHE_A = 1 // Token - Bishop
     * TRANCHE_B = 2 // Token - Rook
     */
    const twapOracle = new TWAPOracle(Config.BTCFund.twapOracle);
    const btcExchange = new ExchangePlusStake(Config.BTCFund.exchange);
    await btcExchange.getUserInfo('0xD2050719eA37325BdB6c18a85F6c442221811FAC');
    const lastTimestamp = await twapOracle.getLastTimestamp();
    console.log(lastTimestamp)
    await btcExchange.getPrice(lastTimestamp);

    // const balance = await Exchange.callReadMethod(
    //     'availableBalanceOf',
    //     0,
    //     '0xD2050719eA37325BdB6c18a85F6c442221811FAC',
    // );
    // logger.info(`Token Queen balance: ${balance}`);

    // const claimableRewards = await Exchange.callReadMethod(
    //     'claimableRewards',
    //     '0xD2050719eA37325BdB6c18a85F6c442221811FAC',
    // );
    // logger.info(`claimable reward token - CHESS: ${claimableRewards}`);

    // // time weighted balanced: (lockedBalance.amount.mul(lockedBalance.unlockTime - timestamp)) / maxTime;
    // const veChessBalance = await VotingEscrow.callReadMethod('balanceOf', '0xD2050719eA37325BdB6c18a85F6c442221811FAC');
    // logger.info(`veChess balance: ${veChessBalance}`);

    // const lockedBalanceInfo = await VotingEscrow.callReadMethod('getLockedBalance', '0xD2050719eA37325BdB6c18a85F6c442221811FAC');
    // logger.info(`locked Token - CHESS balance: ${lockedBalanceInfo}`);
};

main().catch((e) => {
    logger.error(e.message);
});


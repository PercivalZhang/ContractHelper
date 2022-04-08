import { LoggerFactory } from '../../library/LoggerFactory';
import BigNumber from 'bignumber.js';
import { ContractHelper } from '../../library/contract.helper';
import { SwissKnife } from '../../library/swiss.knife';
import { Config } from './Config';
import { FundCategroy } from './data.type';
import { TWAPOracle } from './twap.oracle';


const logger = LoggerFactory.getInstance().getLogger('ExchangePlusStake');
const swissKnife = new SwissKnife(Config.network);

export class TrancheChef {
    public readonly address: string;
    private fundCategory: FundCategroy;
    private chef: ContractHelper;
    private chessController: ContractHelper;
    private twapOracle: TWAPOracle;
    private fund: string;
    private weight: string;
    private wLastTimestamp: number;
    private tokens: string[];
    private prices: string[];
    private timestamp: number;
    private hideExceptionOutput: boolean;

    private static instance: TrancheChef;

    private constructor(fundCategory: FundCategroy) {
        this.fundCategory = fundCategory;
        switch (fundCategory) {
            case FundCategroy.BTCFund:
                this.chef = new ContractHelper(
                    Config.BTCFund.exchange,
                    './BSC/Tranchess/exchange.v2.json',
                    Config.network,
                );
                this.fund = Config.BTCFund.fund;
                this.twapOracle = new TWAPOracle(Config.BTCFund.twapOracle);
                this.tokens = Config.BTCFund.tokens;
                break;
            case FundCategroy.ETHFund:
                this.chef = new ContractHelper(
                    Config.ETHFund.exchange,
                    './BSC/Tranchess/exchange.v2.json',
                    Config.network,
                );
                this.fund = Config.ETHFund.fund;
                this.twapOracle = new TWAPOracle(Config.ETHFund.twapOracle);
                this.tokens = Config.ETHFund.tokens;
                break;
            case FundCategroy.BNBFund:
                this.chef = new ContractHelper(
                    Config.BNBFund.exchange,
                    './BSC/Tranchess/exchange.v2.json',
                    Config.network,
                );
                this.fund = Config.BNBFund.fund;
                this.twapOracle = new TWAPOracle(Config.BNBFund.twapOracle);
                this.tokens = Config.BNBFund.tokens;
                break;
        }
        this.chessController = new ContractHelper(
            Config.chessController,
            './BSC/Tranchess/chess.controller.json',
            Config.network,
        );
        this.timestamp = 0;
        this.wLastTimestamp = 0;
        this.prices = new Array(3);
        this.hideExceptionOutput = false;
    }

    static getInstance(fundCategory: FundCategroy) {
        if (!TrancheChef.instance) {
            TrancheChef.instance = new TrancheChef(fundCategory);
        }
        return TrancheChef.instance;
    }

    public toggleHiddenExceptionOutput() {
        this.hideExceptionOutput = !this.hideExceptionOutput;
    }

    public async getFundWeight() {
        // total weight(BTC+ETH+BNB) = 1e18
        logger.info(`getFundWeight > current last timestamp: ${this.wLastTimestamp}`);
        const lastTimestamp = await this.chessController.callReadMethod('lastTimestamp');
        if(Number.parseInt(lastTimestamp) > this.wLastTimestamp) {
            logger.info(`getFundWeight > detected new last timestamp: ${lastTimestamp}`);
            this.wLastTimestamp = Number.parseInt(lastTimestamp);
            this.weight = await this.chessController.callReadMethod('weights', lastTimestamp, this.fund);
        }
        logger.info(`getFundWeight > updated last timestamp: ${this.wLastTimestamp}`);
        logger.info(`getFundWeight > weight: ${this.weight}`);
        return this.weight;
    }

    public async getUserInfo(userAddress: string) {
        let isStaked = false;
        for (let i = 0; i < 3; i++) {
            const tokenBalance = await this.chef.callReadMethod('availableBalanceOf', i, userAddress);
            if (new BigNumber(tokenBalance).gt(0)) {
                isStaked = true;
                const queenToken = await swissKnife.syncUpTokenDB(Config.BTCFund.tokens[i]);
                logger.info(
                    `token - ${queenToken.symbol} balance: ${queenToken.readableAmount(tokenBalance).toFixed(6)}`,
                );
            }
        }
        if (isStaked) {
            const pendingRewards = await this.chef.callReadMethod('claimableRewards', userAddress);
            const rewardToken = await swissKnife.syncUpTokenDB(Config.chessToken);
            logger.info(
                `pending reward - ${rewardToken.symbol} balance: ${rewardToken
                    .readableAmount(pendingRewards)
                    .toFixed(6)}`,
            );
        }
    }

    public async getPrices(): Promise<string[]> {
        const lastTimestamp = await this.twapOracle.getLastTimestamp();
        logger.info(`chef: ${this.chef.address}`);
        logger.info(`getPrice > last timestamp from oracle: ${lastTimestamp}`);
       
        const priceData = await this.chef.callReadMethod('estimateNavs', lastTimestamp);
       
        console.log(priceData)
        this.prices[0] = priceData['0'];
        this.prices[1] = priceData['1'];
        this.prices[2] = priceData['2'];
        
       
        return this.prices;
    }

    public async getTrancheInfo(trancheId: number) {
        if (trancheId > 2) {
            logger.error(`valid tranche id: 0, 1, 2`);
            return;
        }
        const totalSupply = await this.chef.callReadMethod('totalSupply', trancheId);
        const token = await swissKnife.syncUpTokenDB(this.tokens[trancheId]);
        logger.info(
            `getTrancheInfo > Tranche[${trancheId}]: total staked - ${token.symbol}: ${token
                .readableAmount(totalSupply)
                .toFixed(4)}`,
        );
        const totalStakedValue = new BigNumber(totalSupply).multipliedBy(this.prices[trancheId]).dividedBy(Math.pow(10, token.decimals)).dividedBy(1e18);
        logger.info(
            `getTrancheInfo > Tranche[${trancheId}]: total staked: ${totalStakedValue.toNumber().toFixed(4)} USD`
        );
    }
}

// const main = async () => {
//     const trancheChef = TrancheChef.getInstance(FundCategroy.BTCFund);
//     await trancheChef.getPrices();
//     await trancheChef.getFundWeight();
//     await trancheChef.getUserInfo('0xD2050719eA37325BdB6c18a85F6c442221811FAC');
//     await trancheChef.getTrancheInfo(0);
// };

// main().catch((e) => {
//     logger.error(e.message);
// });

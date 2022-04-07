import { LoggerFactory } from '../../library/LoggerFactory';
import { ContractHelper } from '../../library/contract.helper';
import { SwissKnife } from '../../library/swiss.knife';
import { Config } from './Config';
import BigNumber from 'bignumber.js';

const logger = LoggerFactory.getInstance().getLogger('VotingEscow');
const swissKnife = new SwissKnife(Config.network);

export class VotingEscow {
    private itself: ContractHelper;

    private hideExceptionOutput: boolean;

    private static instance: VotingEscow;

    private constructor() {
        this.itself = new ContractHelper(
            '0x95a2bbcd64e2859d40e2ad1b5ba49dc0e1abc6c2',
            './BSC/Tranchess/voting.escow.json',
            Config.network,
        );
    }

    static getInstance() {
        if (!VotingEscow.instance) {
            VotingEscow.instance = new VotingEscow();
        }
        return VotingEscow.instance;
    }

    public toggleHiddenExceptionOutput() {
        this.hideExceptionOutput = !this.hideExceptionOutput;
    }

    public async getEscowInfo() {
        const chessToken = await swissKnife.syncUpTokenDB(Config.chessToken);
        const totalLockedChess = await this.itself.callReadMethod('totalLocked');
        logger.info(
            `getEscowInfo > total locked Token - ${chessToken.symbol}: ${chessToken
                .readableAmount(totalLockedChess)
                .toFixed(4)}`,
        );

        const veChessToken = await swissKnife.syncUpTokenDB(Config.votingEscow);
        const totalSupply = await this.itself.callReadMethod('totalSupply');
        logger.info(
            `getEscowInfo > total supply of Token - ${veChessToken.symbol}: ${veChessToken.readableAmount(totalSupply).toFixed(4)}`,
        );
    }

    public async getUserInfo(userAddress: string) {
        const chessToken = await swissKnife.syncUpTokenDB(Config.chessToken);
        const veChessToken = await swissKnife.syncUpTokenDB(Config.votingEscow);

        const lockedChessInfo = await this.itself.callReadMethod('getLockedBalance', userAddress);
        logger.info(
            `getUserInfo > locked Token - ${chessToken.symbol} balance: ${chessToken
                .readableAmount(lockedChessInfo[0])
                .toFixed(4)}`,
        );

        const endingTimestamp = new BigNumber(lockedChessInfo[1]);
        const endingDatetime = new Date(endingTimestamp.multipliedBy(1000).toNumber());
        logger.info(`getUserInfo > locked until ${endingDatetime.toLocaleDateString()}`);

        // time weighted balanced: (lockedBalance.amount.mul(lockedBalance.unlockTime - timestamp)) / maxTime;
        const veChessBalance = await this.itself.callReadMethod(
            'balanceOf',
            '0xD2050719eA37325BdB6c18a85F6c442221811FAC',
        );
        logger.info(`getUserInfo > Token - ${veChessToken.symbol} balance: ${veChessToken.readableAmount(veChessBalance).toFixed(4)}`);
    }
}

const main = async () => {
    const voteEscow = VotingEscow.getInstance();
    await voteEscow.getEscowInfo();
    await voteEscow.getUserInfo('0xD2050719eA37325BdB6c18a85F6c442221811FAC');
};

main().catch((e) => {
    logger.error(e.message);
});

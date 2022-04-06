import { ContractHelper } from '../../library/contract.helper';
import { LoggerFactory } from '../../library/LoggerFactory';
import { NetworkType, Web3Factory } from '../../library/web3.factory';
import * as Sleep from 'sleep';
import BigNumber from 'bignumber.js';
import * as path from 'path';
import fs from 'fs';

const network = NetworkType.BSC;
/**
 * exchange contract: 0x1216be0c4328e75ae9adf726141c2254c2dcc1b6
 * voting escow: 0x95a2bbcd64e2859d40e2ad1b5ba49dc0e1abc6c2
 * onion
 * BUSD
 * 100
 * 56
 * 0xb7de5e92de90b97cd94aaf2277fd3f887717199ed69e22cf07314ea1b5a6fcc79545156b35faa8c715de73a289e9aa68147a5c2a4130cc6a300717f321ab
 */
const Exchange = new ContractHelper('0x1216be0c4328e75ae9adf726141c2254c2dcc1b6', './Tranchess/exchange.json', network);
const VotingEscrow = new ContractHelper('0x95a2bbcd64e2859d40e2ad1b5ba49dc0e1abc6c2', './Tranchess/voting.escrow.json', network);

const logger = LoggerFactory.getInstance().getLogger('main');

const main = async () => {
    //Exchange.toggleHiddenExceptionOutput();

    /**
     * TRANCHE_M = 0 // Token - Queen
     * TRANCHE_A = 1 // Token - Bishop
     * TRANCHE_B = 2 // Token - Rook
     */
    const balance = await Exchange.callReadMethod(
        'availableBalanceOf',
        0,
        '0xD2050719eA37325BdB6c18a85F6c442221811FAC',
    );
    logger.info(`Token Queen balance: ${balance}`);

    const claimableRewards = await Exchange.callReadMethod(
        'claimableRewards',
        '0xD2050719eA37325BdB6c18a85F6c442221811FAC',
    );
    logger.info(`claimable reward token - CHESS: ${claimableRewards}`);

    // time weighted balanced: (lockedBalance.amount.mul(lockedBalance.unlockTime - timestamp)) / maxTime;
    const veChessBalance = await VotingEscrow.callReadMethod('balanceOf', '0xD2050719eA37325BdB6c18a85F6c442221811FAC');
    logger.info(`veChess balance: ${veChessBalance}`);

    const lockedBalanceInfo = await VotingEscrow.callReadMethod('getLockedBalance', '0xD2050719eA37325BdB6c18a85F6c442221811FAC');
    logger.info(`locked Token - CHESS balance: ${lockedBalanceInfo}`);
};

main().catch((e) => {
    logger.error(e.message);
});

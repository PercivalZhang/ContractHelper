import { LoggerFactory } from '../../library/LoggerFactory';
import { NetworkType } from '../../library/web3.factory';
import { SwissKnife } from '../../library/swiss.knife';
import BigNumber from 'bignumber.js';
import { Config } from './Config';
import { SuperVault } from './vault';

const network = NetworkType.AVALANCHE;

const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('main');

const superVault = new SuperVault(Config.vaults['0'], network);

const main = async () => {
    await superVault.getUserReceipt('0x881897b1FC551240bA6e2CAbC7E59034Af58428a');
    logger.info(`----------------------------------------------------`);
    await superVault.getVaultInfo();
};

main().catch((e) => {
    logger.error(e.message);
});

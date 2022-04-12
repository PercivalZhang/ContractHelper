import { LoggerFactory } from '../../library/LoggerFactory';
import BigNumber from 'bignumber.js';
import { ContractHelper } from '../../library/contract.helper';
import { SwissKnife } from '../../library/swiss.knife';
import { Config } from './Config';
import { Web3Factory } from '../../library/web3.factory';

const logger = LoggerFactory.getInstance().getLogger('ExchangePlusStake');
const swissKnife = new SwissKnife(Config.network);

const web3 = Web3Factory.getInstance().getWeb3(Config.network);

const pk = '';
const fromAccount = web3.eth.accounts.privateKeyToAccount(pk);

const test = new ContractHelper('0x8b7218cf6ac641382d7c723de8aa173e98a80196', './BSC/Tranchess/test.json', Config.network);


const main = async () => {
   await test.callWriteMethod(fromAccount, '_transfer', '1', 0, '0x5c59d637b40eaeaf8de7d2369b99745108e1730e', '0xD2050719eA37325BdB6c18a85F6c442221811FAC', 1000)
};

main().catch((e) => {
    logger.error(e.message);
});
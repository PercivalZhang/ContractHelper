import { ContractHelper } from './library/contract.helper';
import { LoggerFactory } from './library/LoggerFactory';
import { NetworkType, Web3Factory } from './library/web3.factory';

const network = NetworkType.OKEXChain;

const DAOVault = new ContractHelper('0x90a00130c55caffb32a47bf6e073156cbacb4dc4', './COCOSwap/dao.json', network);

const logger = LoggerFactory.getInstance().getLogger('main');

const main = async () => {
    DAOVault.toggleHiddenExceptionOutput();

    const symbol = await DAOVault.callReadMethod('symbol');
    logger.info(`symbol: ${symbol}`);

    const stakingToken = await DAOVault.callReadMethod('stakingToken');
    logger.info(`staking token: ${stakingToken}`);

    const rewardToken = await DAOVault.callReadMethod('rewardsToken');
    logger.info(`reward token: ${rewardToken}`);

    const balance = await DAOVault.callReadMethod('balancesOf', '0xD2050719eA37325BdB6c18a85F6c442221811FAC');
    logger.info(`balance: ${balance}`);

    const lockInfo = await DAOVault.callReadMethod('locks', '0xD2050719eA37325BdB6c18a85F6c442221811FAC');
    logger.info(`lock information: ${JSON.stringify(lockInfo)}`);

    const rewards = await DAOVault.callReadMethod('rewards', '0xD2050719eA37325BdB6c18a85F6c442221811FAC');
    logger.info(`pending reward: ${rewards}`);

};

main().catch((e) => {
    logger.error(e.message);
});

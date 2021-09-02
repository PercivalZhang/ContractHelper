import { ContractHelper } from './library/contract.helper';
import { LoggerFactory } from './library/LoggerFactory';
import { NetworkType, Web3Factory } from './library/web3.factory';
import BigNumber from 'bignumber.js';

// 0x6636Cc488964AA2E9F2644248601B2909eCC394E'  // greyscale
// '0x7Ce9A4f22FB3B3e2d91cC895bb082d7BD6F08525',
const network = NetworkType.HECO;

const proxyAdmin = new ContractHelper(
    '0x05fABBFEcE4F804E7c86aC3eBcC306B2Ea817F1a',
    'ProxyAdmin.json',
    network
);

const logger = LoggerFactory.getInstance().getLogger('main');
const web3 = Web3Factory.getInstance().getWeb3(network);

const proxyContractAddress  = '0x80d1769ac6fee59BE5AAC1952a90270bbd2Ceb2F';
const main = async () => {

    const impl = await proxyAdmin.callReadMethod('getProxyImplementation', proxyAdmin);
    logger.info(`proxy impl contract: ${impl}`);

    const admin = await proxyAdmin.callReadMethod('getProxyAdmin', proxyContractAddress);
    logger.info(admin);

    const owner = await proxyAdmin.callReadMethod('owner');
    logger.info(owner);
};

main().catch((e) => {
    logger.error(e.message);
});

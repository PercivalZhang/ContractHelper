import { ContractHelper } from './library/contract.helper';
import { LoggerFactory } from './library/LoggerFactory';
import { NetworkType, Web3Factory } from './library/web3.factory';

const network = NetworkType.OKEXChain;

const Vault = new ContractHelper('0x79C5051cf05af7eD1716a0b0C458a563CEd80c2f', './BXH/test.json', network);

const logger = LoggerFactory.getInstance().getLogger('main');

const main = async () => {
    Vault.toggleHiddenExceptionOutput();

    const symbol = await Vault.callReadMethod('symbol');
    logger.info(`symbol: ${symbol}`);

    const balance = await Vault.callReadMethod('balanceOf', '0xD2050719eA37325BdB6c18a85F6c442221811FAC');
    logger.info(`balance: ${balance}`);

};

main().catch((e) => {
    logger.error(e.message);
});

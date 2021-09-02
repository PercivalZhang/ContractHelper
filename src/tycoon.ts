import { ContractHelper } from './library/contract.helper';
import { LoggerFactory } from './library/LoggerFactory';
import { NetworkType, Web3Factory } from './library/web3.factory';


const network = NetworkType.HECO;

const tycoon = new ContractHelper('0x429d825d9f62f31c0224bb09a82d798618a88bd9', './tycoon/test.json', network);

const logger = LoggerFactory.getInstance().getLogger('main');

const main = async () => {
    tycoon.toggleHiddenExceptionOutput();

    const symbol = await tycoon.callReadMethod('symbol');
    logger.info(`symbol: ${symbol}`);

    const myBalance = await tycoon.callReadMethod('balanceOf', '0x30Be031A6F3A07F7B8Bb383FD47c89b0D6F7607a');
    logger.info(`my nft balance: ${myBalance}`);

    const tokenId = await tycoon.callReadMethod('tokenOfOwnerByIndex', '0x30Be031A6F3A07F7B8Bb383FD47c89b0D6F7607a', 0);
    logger.info(`my nft token id: ${tokenId}`);

    const tokenIds = await tycoon.callReadMethod('tokensOfOwner', '0x30Be031A6F3A07F7B8Bb383FD47c89b0D6F7607a');
    logger.info(`my nft token ids: ${tokenIds}`);

    const tokenURI = await tycoon.callReadMethod('tokenURI', 1);
    logger.info(`my nft token URI: ${tokenURI}`);

    const baseURI = await tycoon.callReadMethod('baseURI');
    logger.info(`my nft token base URI: ${baseURI}`);
};

main().catch((e) => {
    logger.error(e.message);
});

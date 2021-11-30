import { ContractHelper } from './library/contract.helper';
import { LoggerFactory } from './library/LoggerFactory';
import { NetworkType } from './library/web3.factory';
import { SwissKnife } from './library/swiss.knife';
import BigNumber from 'bignumber.js';

interface LootMetadata {
    name: string;
    description: string;
    image: string;
}

const network = NetworkType.HECO;

const swissKnife = new SwissKnife(network);

const logger = LoggerFactory.getInstance().getLogger('main');

const vLoot = new ContractHelper('0xdbd67269b76f89cfb7b79dacba3105fd6b982c68', './heco.vLoot/vLoot.json', network);
vLoot.toggleHiddenExceptionOutput();

const decodeTokenURI = (tokenURI: string): LootMetadata => {
    const data = JSON.parse(Buffer.from(tokenURI.toString().substr(29), 'base64').toString());
    const metadata: LootMetadata = {
        name: data.name,
        description: data.description,
        image: data.image,
    };
    return metadata;
};

const decodeImage = (imageData: string): string => {
    return Buffer.from(imageData.toString().substr(26), 'base64').toString();
};

const main = async () => {
    const tokenURI = await vLoot.callReadMethod('tokenURI', 77);
    const lootMetadata = decodeTokenURI(tokenURI);
    logger.info(lootMetadata);
    const imageData = decodeImage(lootMetadata.image);
    logger.info(imageData);
};

main().catch((e) => {
    logger.error(e.message);
});

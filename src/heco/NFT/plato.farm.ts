import { ContractHelper } from '../../library/contract.helper';
import { LoggerFactory } from '../../library/LoggerFactory';
import { NetworkType } from '../../library/web3.factory';
import { SwissKnife } from '../../library/swiss.knife';
import { ERC721Helper } from '../../library/erc721.helper';

const network = NetworkType.HECO;

const swissKnife = new SwissKnife(network);

const logger = LoggerFactory.getInstance().getLogger('main');

const Config = {
    Farm: {
        address: '0x892E674dA88F5BBc11886f10a072286FEE8B33Df',
        methods: {
            balanceOf: 'balanceOf',
            tokenOfOwnerByIndex: 'tokenOfOwnerByIndex',
            tokenURI: 'tokenURI',
            ownerOf: 'ownerOf',
        },
    },
};

const erc721Helper = new ERC721Helper(network, Config.Farm, './NFT/PlatoFarm/plato.nft.json');

const callBack = async (tokenId: Number, helper: ContractHelper) => {
    const baseURI = 'https://resource.platofarm.game/nft/';
    const tokenURI = baseURI + tokenId;
    const strTokenId = tokenId.toString();
    // token Id编号的前三位代表了该NFT所属的分类
    const code = strTokenId.substr(0, 3);
    let category = 'unkown';
    switch (Number.parseInt(code)) {
        case 100:
            category = 'FarmLand';
            break;
        case 101:
            category = 'FruitLand';
            break;
    }
    logger.info(`[${category}]<${tokenId}> : ${tokenURI}`);
};

const main = async () => {
    await erc721Helper.getMyNFTReceipts('0xf9f9b86a40724d77c8176453b4d74b10ab3d6be8', callBack);
};

main().catch((e) => {
    logger.error(e.message);
});

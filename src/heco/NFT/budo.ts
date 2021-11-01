import { ContractHelper } from '../../library/contract.helper';
import { LoggerFactory } from '../../library/LoggerFactory';
import { NetworkType } from '../../library/web3.factory';
import { SwissKnife } from '../../library/swiss.knife';
import { ERC721Helper } from '../../library/erc721.helper';

const network = NetworkType.HECO;

const swissKnife = new SwissKnife(network);

const logger = LoggerFactory.getInstance().getLogger('main');

export enum TraitType {
    Character,
    Equipment,
    State,
}

const Config = {
    card: {
        address: '0x0d58C0b5bfae8437337303203555049c03f49DfA', // heco
        methods: {
            balanceOf: 'balanceOf',
            tokenOfOwnerByIndex: 'tokenOfOwnerByIndex',
            tokenURI: 'tokenURI',
            ownerOf: 'ownerOf',
        },
    },
};

const cardHelper = new ERC721Helper(network, Config.card, './NFT/BUDO/card.json');
const callbackCard = async (tokenId: Number, helper: ContractHelper) => {
    // const power = await helper.callReadMethod('getPower', tokenId);
    // const characterInfo = await helper.callReadMethod('get', tokenId);
    // /**
    //  *  return (c.xp, c.level, c.trait, c.staminaTimestamp,
    //         getRandomCosmetic(cc.seed, 1, 13), // head
    //         getRandomCosmetic(cc.seed, 2, 45), // arms
    //         getRandomCosmetic(cc.seed, 3, 61), // torso
    //         getRandomCosmetic(cc.seed, 4, 41), // legs
    //         getRandomCosmetic(cc.seed, 5, 22), // boots
    //         getRandomCosmetic(cc.seed, 6, 2) // race
    //     );
    //  */
    // const xp = characterInfo[0]; //经验
    // const level = characterInfo[1]; //级别
    // const traitCode = characterInfo[2]; //元素特性 0:Fire火 | 1:Earth土 ｜ 2:Lightning闪电 ｜ 3:Wate水
    // const trait = getTraitFromCode(Number.parseInt(traitCode), TraitType.Character);
    // logger.info(`character[${tokenId}] : Power:${power} | XP:${xp} | Level:${level} | Trait:${trait}`);
};

const main = async () => {
    const owner = await cardHelper.getOwnerOf(1026);
    console.log(owner);
    const balance = await cardHelper.balanceOf(owner);
    console.log(balance);
    const tokenId = await cardHelper.tokenOfOwnerByIndex(owner, 0);
    console.log(tokenId);
    const tokenURI = await cardHelper.tokenURI(tokenId);
    console.log(tokenURI);
    // await cardHelper.getMyNFTReceipts(owner, callbackCard);
};

main().catch((e) => {
    logger.error(e.message);
});

import { ContractHelper } from '../../library/contract.helper';
import { LoggerFactory } from '../../library/LoggerFactory';
import { NetworkType } from '../../library/web3.factory';
import { SwissKnife } from '../../library/swiss.knife';
import { ERC721Helper } from '../../library/erc721.helper';

const network = NetworkType.HECO;

const swissKnife = new SwissKnife(network);

const logger = LoggerFactory.getInstance().getLogger('main');

const Config = {
    character: {
        address: '0xF6092CDEaabd02069cB56E2b770367AAcf49dfba', // heco
        //address: '0xc6f252c2cdd4087e30608a35c022ce490b58179b', // bsc
        methods: {
            balanceOf: 'balanceOf',
            tokenOfOwnerByIndex: 'tokenOfOwnerByIndex',
            tokenURI: 'tokenURI',
        },
    },
    weapon: {
        address: '0xa0f254436E43239D2B3947A9D590C495738B6A4C', // heco
        methods: {
            balanceOf: 'balanceOf',
            tokenOfOwnerByIndex: 'tokenOfOwnerByIndex',
            tokenURI: 'tokenURI',
        },
    },
};

const characterHelper = new ERC721Helper(network, Config.character, './NFT/CryptoBlades/character.json');
const callBackCharacter = async (tokenId: Number, helper: ContractHelper) => {
    const power = await helper.callReadMethod('getPower', tokenId);
    const characterInfo = await helper.callReadMethod('get', tokenId);
    /**
     *  return (c.xp, c.level, c.trait, c.staminaTimestamp,
            getRandomCosmetic(cc.seed, 1, 13), // head
            getRandomCosmetic(cc.seed, 2, 45), // arms
            getRandomCosmetic(cc.seed, 3, 61), // torso
            getRandomCosmetic(cc.seed, 4, 41), // legs
            getRandomCosmetic(cc.seed, 5, 22), // boots
            getRandomCosmetic(cc.seed, 6, 2) // race
        );
     */
    const xp = characterInfo[0]; //经验
    const level = characterInfo[1]; //级别
    const trait = characterInfo[2]; //元素特性 0:Fire火 | 1:Earth土 ｜ 2:Lightning闪电 ｜ 3:Wate水
    logger.info(`character[${tokenId}] : power:${power} | xp:${xp} | level:${level} | trait:${trait}`);
};

const weaponHelper = new ERC721Helper(network, Config.weapon, './NFT/CryptoBlades/weapon.json');
const callBackWeapon = async (tokenId: Number, helper: ContractHelper) => {
    //武器星级1～5星，code： 0～4
    const starts = await helper.callReadMethod('getStars', tokenId);
    //获取武器元素属性（0:Fire火 | 1:Earth土 ｜ 2:Lightning闪电 ｜ 3:Wate水）
    const trait = await helper.callReadMethod('getTrait', tokenId);
    //获取武器当前耐久度，最大耐久度20
    const durabilityPoints = await helper.callReadMethod('getDurabilityPoints', tokenId);
    logger.info(`weapon[${tokenId}] : stars(${starts}) | trait(${trait}) | durabilityPoints(${durabilityPoints})`);
    const details = await helper.callReadMethod('get', tokenId);
    /**
     *      uint16 _properties, uint16 _stat1, uint16 _stat2, uint16 _stat3, uint8 _level,
            uint8 _blade, uint8 _crossguard, uint8 _grip, uint8 _pommel,
            uint24 _burnPoints, // burn points.. got stack limits so i put them together
            uint24 _bonusPower // bonus power
     */
    console.log(details);
};
const main = async () => {
    await characterHelper.getMyNFTReceipts('0xA061FF4B849d36F0638BF77D4e964648DEE88DC1', callBackCharacter);
    await weaponHelper.getMyNFTReceipts('0xa9d47Fb4ae950bB187C8ADD7A2a6e36c184339bE', callBackWeapon);
};

main().catch((e) => {
    logger.error(e.message);
});

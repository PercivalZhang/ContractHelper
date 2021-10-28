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
    shield: {
        address: '0xb4eD70aC5B00ca0fd9526089489979e116E45ec0', // heco
        methods: {
            balanceOf: 'balanceOf',
            tokenOfOwnerByIndex: 'tokenOfOwnerByIndex',
            tokenURI: 'tokenURI',
        },
    },
};
const getTraitFromCode = (traitCode: number, itemType: TraitType) => {
    switch (traitCode) {
        case 0:
            if (itemType == TraitType.State) return 'Fire<STREN>';
            else return 'Fire';
        case 1:
            if (itemType == TraitType.State) return 'Earth<DEX>';
            else return 'Earth';
        case 2:
            if (itemType == TraitType.State) return 'Lightning<CHA>';
            else return 'Lightning';
        case 3:
            if (itemType == TraitType.State) return 'Water<INT>';
            else return 'Water';
        default:
            return '(PWR)';
    }
};

const characterHelper = new ERC721Helper(network, Config.character, './NFT/CryptoBlades/character.json');
const callbackCharacter = async (tokenId: Number, helper: ContractHelper) => {
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
    const traitCode = characterInfo[2]; //元素特性 0:Fire火 | 1:Earth土 ｜ 2:Lightning闪电 ｜ 3:Wate水
    const trait = getTraitFromCode(Number.parseInt(traitCode), TraitType.Character);
    logger.info(`character[${tokenId}] : Power:${power} | XP:${xp} | Level:${level} | Trait:${trait}`);
};

const weaponHelper = new ERC721Helper(network, Config.weapon, './NFT/CryptoBlades/weapon.json');
const callbackWeapon = async (tokenId: Number, helper: ContractHelper) => {
    //星级1～5星，code： 0～4
    const starts = await helper.callReadMethod('getStars', tokenId);
    //获取本身元素属性（0:Fire火 | 1:Earth土 ｜ 2:Lightning闪电 ｜ 3:Wate水）
    const traitCode = await helper.callReadMethod('getTrait', tokenId);
    const trait = getTraitFromCode(Number.parseInt(traitCode), TraitType.Equipment);
    //获取当前耐久度，最大耐久度20
    const durabilityPoints = await helper.callReadMethod('getDurabilityPoints', tokenId);
    logger.info(`weapon[${tokenId}] : Stars(${starts}) | Trait(${trait}) | DurabilityPoints(${durabilityPoints})`);
    const details = await helper.callReadMethod('get', tokenId);
    /**
     *      uint16 _properties, uint16 _stat1, uint16 _stat2, uint16 _stat3, uint8 _level,
            uint8 _blade, uint8 _crossguard, uint8 _grip, uint8 _pommel,
            uint24 _burnPoints, // burn points.. got stack limits so i put them together
            uint24 _bonusPower // bonus power
     */
    // console.log(details);
    /**
     * 武器最大可以有3个额外属性
     * stat1/stat2/stat3
     * 每个属性可以是四种元素属性中一种（0:Fire火 | 1:Earth土 ｜ 2:Lightning光 ｜ 3:Wate水）
     * 也可以是非元素属性，即traitless（4）
     * Fire火对应是strength
     * Earth土对应是dexterity
     * Lightning光对应是Charm
     * Water水对应是Intelligence
     *
     * weapon的星级(1~5星)决定了其可以附加额外属性的数量
     * 规则：
     *    3星和3星以下，只能有1个附加的属性
     *    4星，有2个附加属性
     *    5星，有3个附加属性
     */
    const statPattern = await helper.callReadMethod('getStatPattern', tokenId);
    const stat1TraitCode = await helper.callReadMethod('getStat1Trait', statPattern);
    const stat1Trait = getTraitFromCode(Number.parseInt(stat1TraitCode), TraitType.State);
    const stat2TraitCode = await helper.callReadMethod('getStat2Trait', statPattern);
    const stat2Trait = getTraitFromCode(Number.parseInt(stat2TraitCode), TraitType.State);
    const stat3TraitCode = await helper.callReadMethod('getStat3Trait', statPattern);
    const stat3Trait = getTraitFromCode(Number.parseInt(stat3TraitCode), TraitType.State);

    logger.info(
        `weapon[${tokenId}] : Stat1(${stat1Trait}:${details._stat1}) / Stat2(${stat2Trait}:${details._stat2}) / Stat3(${stat3Trait}:${details._stat3})`,
    );
};

const shieldHelper = new ERC721Helper(network, Config.shield, './NFT/CryptoBlades/shield.json');
const callbackShield = async (tokenId: Number, helper: ContractHelper) => {
    //星级1～5星，code： 0～4
    const starts = await helper.callReadMethod('getStars', tokenId);
    //获取本身元素属性（0:Fire火 | 1:Earth土 ｜ 2:Lightning闪电 ｜ 3:Wate水）
    const traitCode = await helper.callReadMethod('getTrait', tokenId);
    const trait = getTraitFromCode(Number.parseInt(traitCode), TraitType.Equipment);
    //获取当前耐久度，最大耐久度20
    const durabilityPoints = await helper.callReadMethod('getDurabilityPoints', tokenId);
    logger.info(`shield[${tokenId}] : Stars(${starts}) | Trait(${trait}) | DurabilityPoints(${durabilityPoints})`);
    const details = await helper.callReadMethod('get', tokenId);
    /**
     *   uint16 _properties, uint16 _stat1, uint16 _stat2, uint16 _stat3
     */
    // console.log(details);
    /**
     * 盾牌可以附加3个额外属性
     * stat1/stat2/stat3
     * 每个属性可以是四种元素属性中一种（0:Fire火 | 1:Earth土 ｜ 2:Lightning光 ｜ 3:Wate水）
     * 也可以是非元素属性，即traitless（4）
     * Fire火对应是strength
     * Earth土对应是dexterity
     * Lightning光对应是Charm
     * Water水对应是Intelligence
     *
     * 盾牌的星级(1~5星)决定了其可以附加额外属性的数量
     * 规则：
     *    3星和3星以下，只能有1个附加的属性
     *    4星，有2个附加属性
     *    5星，有3个附加属性
     */
    const statPattern = await helper.callReadMethod('getStatPattern', tokenId);
    const stat1TraitCode = await helper.callReadMethod('getStat1Trait', statPattern);
    const stat1Trait = getTraitFromCode(Number.parseInt(stat1TraitCode), TraitType.State);
    const stat2TraitCode = await helper.callReadMethod('getStat2Trait', statPattern);
    const stat2Trait = getTraitFromCode(Number.parseInt(stat2TraitCode), TraitType.State);
    const stat3TraitCode = await helper.callReadMethod('getStat3Trait', statPattern);
    const stat3Trait = getTraitFromCode(Number.parseInt(stat3TraitCode), TraitType.State);

    logger.info(
        `shield[${tokenId}] : Stat1(${stat1Trait}:${details._stat1}) / Stat2(${stat2Trait}:${details._stat2}) / Stat3(${stat3Trait}:${details._stat3})`,
    );
};

const main = async () => {
    await characterHelper.getMyNFTReceipts('0xA061FF4B849d36F0638BF77D4e964648DEE88DC1', callbackCharacter);
    await weaponHelper.getMyNFTReceipts('0xa9d47Fb4ae950bB187C8ADD7A2a6e36c184339bE', callbackWeapon);
    await shieldHelper.getMyNFTReceipts('0xEc692498a3a0d7Ec69593F6286Dce5668c611600', callbackShield);
};

main().catch((e) => {
    logger.error(e.message);
});

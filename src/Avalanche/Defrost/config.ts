import { NetworkType } from '../../library/web3.factory'; 
export const Config = {
    network: NetworkType.AVALANCHE,
    //LP挖矿
    vaults: [
        '0x8fe7a130da6299fe132b664f25d20c6799fca523', //Super Benqi ETH, 版本SV
    ],
    H2O: '0x026187bdbc6b751003517bcb30ac7817d5b766f8',
    SMELT: '0xb2d69b273daa655d1ac7031615b36e23d5b302f4',
    MELT: '0x47eb6f7525c1aa999fbc9ee92715f5231eb1241d',
    farms: {
       H203CRV: '0x40A2bf8a6091010cAE4a96e02e13D5b7157bE236' 
    },
    smeltSavings: '0x1e93b54ac156ac2fc9714b91fa10f1b65e2dafd9',
    priceMelt: 0.354
};

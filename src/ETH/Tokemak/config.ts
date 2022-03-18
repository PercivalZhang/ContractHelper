import { NetworkType } from '../../library/web3.factory'; 
export const Config = {
    network: NetworkType.ETH_MAIN,
    POLYGON: NetworkType.POLYGON,
    //LP挖矿
    pools: {
        pair: {
            ETH: '0xd3d13a578a53685b4ac36a1bab31912d2b2a2f36', //ETH
            FRAX: '0x94671a3cee8c7a12ea72602978d1bb84e920efb2',
            wormUST: '0x482258099de8de2d0bda84215864800ea7e6b03d',
            USDC: '0x04bda0cf6ad025948af830e75228ed420b0e860d', //USDC
            gOHM: '0xe7a7d17e2177f66d035d9d50a7f48d8d8e31532d',
            ALUSD: '0x7211508d283353e77b9a7ed2f22334c219ad4b4c',
            DAI: '0x0ce34f4c26ba69158bc2eb8bf513221e44fdfb75',
            FEI: '0x03dcccd17cc36ee61f9004bcfd7a85f58b2d360d',
            MIM: '0x2e9f9becf5229379825d0d3c1299759943bd4fed',
            LUSD: '0x9eee9ee0cbd35014e12e1283d9388a40f69797a3',
        }
    },
    TOKE: '0x2e9d63788249371f1DFC918a52f8d799F4a38C94',
    priceToke: 23.8
};

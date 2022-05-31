import { NetworkType } from '../../library/web3.factory';
export const Config = {
    network: NetworkType.ETH_MAIN,
    vaults: {
        tokens: {
            stETH: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
            weth: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
        },
        usdc: {
            address: '0xc8871267e07408b89aA5aEcc58AdCA5E574557F8',
            price: 1
        },
        dai: {
            address: '0x40a9d39aa50871df092538c5999b107f34409061',
            price: 1
        },        
        btc: {
            address: '0xEC363faa5c4dd0e51f3D9B5d0101263760E7cdeB',
            price: 30364.5
        },
        eth: {
            address: '0xc383a3833a87009fd9597f8184979af5edfad019',
            price: 1902.04
        },
    },
    price: {
        eth: 1902.04
    }
};
import { NetworkType } from '../../library/web3.factory';
export const Config = {
    network: NetworkType.ETH_MAIN,
    vaults: {
        usdc: {
            address: '0xc8871267e07408b89aA5aEcc58AdCA5E574557F8',
            tokens: {
                stETH: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
                weth: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
            }
        },
    }
};
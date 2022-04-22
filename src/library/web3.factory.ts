import Web3 from 'web3';

// const HECO_TEST = 'https://http-testnet.hecochain.com';
// const HECO_MAIN = 'https://http-mainnet-node.huobichain.com';
// const ETH_MAIN = 'https://mainnet.infura.io/v3/11ae2b7ff4c04391b71dd5a196c21b0d';
// const Polygon = 'https://polygon-rpc.com';
// const OKExChain = 'https://exchainrpc.okex.org';
// const BSC = 'https://bsc-dataseed.binance.org';
// //const FANTOM = 'https://rpc.ftm.tools/';
// const FANTOM = 'Https://rpc.fantom.network';
// // const BSC = 'https://bsc-dataseed1.binance.org/'
// const CRONOS = 'https://rpc.vvs.finance'; // chain id = 25
// const AVALANCHE = 'https://api.avax.network/ext/bc/C/rpc'; // chain id = 25
// const ARBITRUM = 'https://arb1.arbitrum.io/rpc';

export enum NetworkType {
    ETH_MAIN,
    HECO,
    HECO_TEST,
    BSC,
    POLYGON,
    OKEXChain,
    FANTOM,
    CRONOS,
    AVALANCHE,
    ARBITRUM,
}

const Chains = {
    0: {
        rpcURI: 'https://mainnet.infura.io/v3/11ae2b7ff4c04391b71dd5a196c21b0d', // ETH Main
        blockDelta: 12.5,
    },
    1: {
        rpcURI: 'https://http-mainnet-node.huobichain.com', // HECO
        blockDelta: 12.5,
    },
    3: {
        rpcURI: 'https://bsc-dataseed.binance.org', // BSC
        blockDelta: 3,
    },
    4: {
        rpcURI: 'https://polygon-rpc.com', // Polygon
        blockDelta: 2,
    },
    6: {
        rpcURI: 'https://rpc.fantom.network', // Fantom
    },
    7: {
        rpcURI: 'https://rpc.vvs.finance', // Cronus
    },
    8: {
        rpcURI: 'https://api.avax.network/ext/bc/C/rpc', // Avax
    },
    9: {
        rpcURI: 'https://arb1.arbitrum.io/rpc', // Arbitrum
        blockDelta: 12.5,
    },
};

export class Web3Factory {
    private static instance: Web3Factory;

    private constructor() {}

    static getInstance() {
        if (!Web3Factory.instance) {
            Web3Factory.instance = new Web3Factory();
        }
        return Web3Factory.instance;
    }

    getWeb3(network: NetworkType): Web3 {
        return new Web3(Chains[network].rpcURI);
    }
}

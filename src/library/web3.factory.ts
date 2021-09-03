import Web3 from 'web3';

const HECO_TEST = 'https://http-testnet.hecochain.com';
const HECO_MAIN = 'https://http-mainnet.hecochain.com';
const ETH_MAIN = 'https://mainnet.infura.io/v3/11ae2b7ff4c04391b71dd5a196c21b0d';
const Polygon = 'https://matic-mainnet.chainstacklabs.com';
const OKExChain = 'https://exchainrpc.okex.org';
const BSC = 'https://bsc-dataseed.binance.org';
//const BSC = 'https://bsc-dataseed1.binance.org/'
export enum NetworkType {
    ETH_MAIN,
    HECO,
    HECO_TEST,
    BSC,
    POLYGON,
    OKEXChain
}

export class Web3Factory {
    private static instance: Web3Factory;

    private constructor() {

    }

    static getInstance() {
        if (!Web3Factory.instance) {
            Web3Factory.instance = new Web3Factory();
        }
        return Web3Factory.instance;
    }

    getWeb3(network: NetworkType): Web3 {
        switch (network) {
            case NetworkType.HECO:
                return new Web3(HECO_MAIN);
            case NetworkType.HECO_TEST:
                return new Web3(HECO_TEST);
            case NetworkType.ETH_MAIN:
                return new Web3(ETH_MAIN);
            case NetworkType.POLYGON:
                return new Web3(Polygon);
            case NetworkType.OKEXChain:
                return new Web3(OKExChain);
            case NetworkType.BSC:
                return new Web3(BSC);
            default:
                return new Web3(ETH_MAIN);
        }
    }
}

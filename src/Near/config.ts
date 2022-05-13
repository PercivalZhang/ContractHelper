import { keyStores } from "near-api-js";
export const ChainConfig = {
    mainnet: {
        networkId: "mainnet",
        keyStore: new keyStores.InMemoryKeyStore(),
        headers: {},
        nodeUrl: "https://public-rpc.blockpi.io/http/near",
        walletUrl: "https://wallet.mainnet.near.org",
        helperUrl: "https://helper.mainnet.near.org",
        explorerUrl: "https://explorer.mainnet.near.org",
    },
    account: {
        default: '4a04621225d430f5939a265d4995c1e6cb60768c1a8e4c7b8a4da1f7fac982ce'
    }
};

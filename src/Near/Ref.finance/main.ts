import * as nearAPI from "near-api-js";
import { LoggerFactory } from '../../library/LoggerFactory';

const logger = LoggerFactory.getInstance().getLogger('main');

const { connect, keyStores, KeyPair } = nearAPI;

const keyStore = new keyStores.InMemoryKeyStore();
// const PRIVATE_KEY =
//   "by8kdJoJHu7uUkKfoaLd2J2Dp1q1TigeWMG123pHdu9UREqPcshCM223kWadm";
// // creates a public / private key pair using the provided private key
// const keyPair = KeyPair.fromString(PRIVATE_KEY);


const config = {
  networkId: "mainnet",
  keyStore,
  headers: {},
  nodeUrl: "https://public-rpc.blockpi.io/http/near",
  walletUrl: "https://wallet.mainnet.near.org",
  helperUrl: "https://helper.mainnet.near.org",
  explorerUrl: "https://explorer.mainnet.near.org",
};

const main = async () => {
    // adds the keyPair you created to keyStore
    // await keyStore.setKey("testnet", "example-account.testnet", keyPair);
    const near = await connect(config);
    const account = await near.account("4a04621225d430f5939a265d4995c1e6cb60768c1a8e4c7b8a4da1f7fac982ce");
    console.log(await account.state())

    const farmSize = await account.viewFunction('v2.ref-farming.near', 'get_number_of_farms', {});
    console.log(farmSize);
    
    //获取用户seed和farming share balance
    const userSeeds = await account.viewFunction('v2.ref-farming.near', 'list_user_seeds', { account_id: account.accountId });
    console.log(userSeeds);

    const seedInfo = await account.viewFunction('v2.ref-farming.near', 'get_seed_info', { seed_id: 'v2.ref-finance.near@3020' });
    console.log(seedInfo);

    //根据seed_id获取该seed_id下的所有farm信息
    const farms = await account.viewFunction('v2.ref-farming.near', 'list_farms_by_seed', { seed_id: 'v2.ref-finance.near@3020' });
    console.log(farms);

    //指定farm的目标账户的待领取奖励数量
    const claimableRewards = await account.viewFunction('v2.ref-farming.near', 'get_unclaimed_reward', { account_id: account.accountId, farm_id: 'v2.ref-finance.near@3020#0' });
    console.log(claimableRewards);
};

main().catch((e) => {
    logger.error(e.message);
});


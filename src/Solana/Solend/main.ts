import { Connection, PublicKey } from '@solana/web3.js';
import { ObligationParser } from './obligation';
import { SolendMarket } from '@solendprotocol/solend-sdk';

const connection = new Connection('https://solana-mainnet.phantom.tech', 'confirmed');

// const SOLEND_PROGRAM_ID = 'So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo';
// const LENDING_MARKET_MAIN = '4UpD2fh7xH3VP9QQaXtsS1YY3bxzWhtfpks7FatyKvdY';

// const OBLIGATION_LEN = 1300;

// const RESERVES_TO_ASSET_MAP = {
//     '8PbodeaosQP19SjYFx855UMqWxH2HynZLdBXmsrbac36': 'SOL',
//     BgxfHJDzm44T7XG68MYKx7YisTjZu73tVovyZSjJMpmw: 'USDC',
//     '3PArRsZQ6SLkr1WERZWyC6AqsajtALMq4C66ZMYz4dKQ': 'ETH',
//     GYzjMCXTDue12eUGKKWAqtF5jcBYNmewr6Db6LaguEaX: 'BTC',
// };

// const getObligations = async() => {
//     const accounts = await connection.getProgramAccounts(new PublicKey(SOLEND_PROGRAM_ID), {
//         commitment: connection.commitment,
//         filters: [
//             {
//                 memcmp: {
//                     offset: 10,
//                     bytes: LENDING_MARKET_MAIN,
//                 },
//             },
//             {
//                 dataSize: OBLIGATION_LEN,
//             },
//         ],
//         encoding: 'base64',
//     });
//     console.log('Number of users:', accounts.length);
//     const obligations = accounts.map((account) => ObligationParser(account.pubkey, account.account));
//     return obligations;
// };

const main = async() => {
  const market = await SolendMarket.initialize(
    connection
  );
  //console.log(market.reserves.map(reserve => reserve.config.loanToValueRatio);
  // 2. Read on-chain accounts for reserve data and cache
  await market.loadReserves();
  const usdcReserve = market.reserves.find(res => res.config.symbol === 'USDC');
  console.log(usdcReserve.stats.totalDepositsWads.toString());
  
  const obligation = await market.fetchObligationByWallet(new PublicKey('4P9p1LRcJ7Mqo3eH7ww25z5VGVfHMEegWEsDhUTowuwS'));
  console.log(obligation)

}

main().catch(e => {
  console.error(e.message);
})

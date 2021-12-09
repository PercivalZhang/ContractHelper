import * as web3 from '@solana/web3.js';
import * as splToken from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { LoggerFactory } from '../library/LoggerFactory';
import { solUSDCPool } from './pools';
import { solUsdcAqFarm } from './farms';
import { deserializeAccount, findAssociatedTokenAddress } from './utils';
import { usdcToken, solToken, readableAmount } from './tokens';
import { OrcaPool } from './pool';
import { OrcaFarm } from './farm';
import { AccountInfo, AccountLayout, TOKEN_PROGRAM_ID, u64 } from '@solana/spl-token';
import BigNumber from 'bignumber.js';
import { TokenListProvider, TokenInfo } from '@solana/spl-token-registry';

const logger = LoggerFactory.getInstance().getLogger('main');

const main = async () => {
    const connection = new web3.Connection(web3.clusterApiUrl('mainnet-beta'), 'confirmed');
    const tokenData = await new TokenListProvider().resolve();
    const tokenList = tokenData.filterByChainId(101).getList();
    let tokenMap = new Map<string, TokenInfo>();
    tokenList.reduce((map, item) => {
        map.set(item.address, item);
        return map;
    }, tokenMap);

    const orcPool = new OrcaPool(connection, solUSDCPool);
    const orcFarm = new OrcaFarm(connection, solUsdcAqFarm);

    const myAddress = '4P9p1LRcJ7Mqo3eH7ww25z5VGVfHMEegWEsDhUTowuwS';
    const myAccount = new PublicKey(myAddress);
    const mySOLAddress = await findAssociatedTokenAddress(myAccount, solToken.mint);
    logger.info(`my token - wSOL account: ${mySOLAddress.toString()}`);
    const myUSDCAddress = await findAssociatedTokenAddress(myAccount, usdcToken.mint);
    logger.info(`my token - USDC account: ${myUSDCAddress.toString()}`);

    const lpToken = tokenMap.get(orcFarm.farmParams.farmTokenMint.toString());
    const myLPTokens = await orcFarm.getFarmBalance(myAccount);
    logger.info(`my lp token - ${lpToken.symbol} balance: ${readableAmount(myLPTokens, lpToken.decimals)}`);

    const totalLPTokens = await orcPool.getLPSupply();
    logger.info(`total lp token - ${lpToken.symbol} balance: ${readableAmount(totalLPTokens, lpToken.decimals)}`);

    const myRatio = myLPTokens.dividedBy(totalLPTokens);
    logger.info(`pool[${lpToken.symbol}] ratio: ${myRatio.multipliedBy(100).toNumber().toFixed(8)}%`);

    const balanceOfTokens = await orcPool.getBalanceOfTokens();
    console.log(balanceOfTokens);
    // const poolUSDCAddress = await findAssociatedTokenAddress(poolAddress, usdcToken.mint);

    // const poolSOLAccountInfo = await connection.getAccountInfo(new PublicKey('ANP74VNsHwSrq9uUSjiSNyNWvf6ZPrKTmE4gHoNd13Lg'));
    // console.log(poolSOLAccountInfo)
    // const result = deserializeAccount(poolSOLAccountInfo?.data);
    // console.log(result.amount.toString())
    //logger.info(`pool SOL balance: ${poolSOLBalance}`);

    //const poolUSDCBalance = await connection.getBalance(poolUSDCAddress);
    // logger.info(`pool USDC balance: ${poolUSDCBalance}`);
    // // get farm data
    // const lptData = await connection.getAccountInfo(new web3.PublicKey(solUsdcAqFarm.address));
    // console.log(lptData);
};

main().catch((e) => {
    logger.error(e.toString());
});

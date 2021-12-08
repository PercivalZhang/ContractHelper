import * as web3 from '@solana/web3.js';
import * as splToken from'@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { LoggerFactory } from '../library/LoggerFactory';
import { solUsdcAqFarm } from './config.farms';
import { OrcaFarm } from './farm';
import { deserializeAccount, findAssociatedTokenAddress } from './utils';
import { usdcToken, solToken } from './tokens';
import { OrcaPool } from './pools';
import { AccountInfo, AccountLayout, TOKEN_PROGRAM_ID, u64 } from '@solana/spl-token';
import BigNumber from 'bignumber.js';

const logger = LoggerFactory.getInstance().getLogger('main');
const Pools = {
    solUSDC: {
        address: new PublicKey("EGZ7tiLeH62TPV1gL8WwbXGzEPa9zmcpVnnkPKKnrE2U"),
        authority: new PublicKey("JU8kmKzDHF9sXWsnoznaFDFezLsE5uomX2JkRMbmsQP"),
        poolTokenMint: new PublicKey("APDFRM3HMr8CAGXwKHiu2f5ePSpaiEJhaURwhsRrUUt9"),
        poolTokenDecimals: 6,
    }
}
const main = async() => {
    const connection = new web3.Connection(
        web3.clusterApiUrl('mainnet-beta'),
        'confirmed',
    );

    // const orcFarm = new OrcaFarm(connection, solUsdcAqFarm);
    // const userAddress = new PublicKey('BiXsjVFhCd6GNCDWub7rrrz4NDh74JxJTW9hihdBqKo4');
    // const myFarmTokens = await orcFarm.getFarmBalance(userAddress);
    // logger.info(`my farm token balance: ${myFarmTokens}`);
    // const totalFarmTokens = await orcFarm.getFarmSupply();
    // logger.info(`total farm token balance: ${myFarmTokens}`);

    // const myRatio = myFarmTokens.dividedBy(totalFarmTokens);
    const orcPool = new OrcaPool(connection, Pools.solUSDC)
    const poolAddress = orcPool.poolParams.authority;
    console.log(poolAddress.toString())

    const poolUSDCAddress = await findAssociatedTokenAddress(poolAddress, usdcToken.mint);
    logger.info(`pool > token - USDC account: ${poolUSDCAddress.toString()}`);

    const testAddress = new PublicKey('CJjGPPLzatU4HoN6n3jcLE9qMxmPTNd51Ug3HNpermfy');
    const testSOLAddress = await findAssociatedTokenAddress(testAddress, solToken.mint);
    logger.info(`token - SOL account: ${testSOLAddress.toString()}`);
    const testUSDCAddress = await findAssociatedTokenAddress(testAddress, usdcToken.mint);
    logger.info(`token - USDC account: ${testUSDCAddress.toString()}`);

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

}

main().catch(e => {
    logger.error(e.toString())
})
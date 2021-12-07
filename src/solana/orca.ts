import * as web3 from '@solana/web3.js';
import * as splToken from'@solana/spl-token';
import bs58 from 'bs58';
import { LoggerFactory } from '../library/LoggerFactory';

const logger = LoggerFactory.getInstance().getLogger('main');

const myPK = '4MApUNnot1YDdiM5SfGfDB7WT56DFUS59vrdPwK2kExk835BvXdgf5TW7V3jRzZWmS4LgqTxstGT1EfHvrEKESx4';

const main = async() => {
    const connection = new web3.Connection(
        web3.clusterApiUrl('devnet'),
        'confirmed',
    );
    // Generate a new wallet keypair and airdrop SOL
    // const wallet = web3.Keypair.generate();
    // console.log(wallet.publicKey.toString())
    // console.log(wallet.secretKey)
    // // 将私钥进行base58编码，编码后类型：string
    // const secretKey = bs58.encode(wallet.secretKey);
    // console.log(secretKey);
   
    // 从字符串私钥（先进行base58解码）加载账号
    const fromWallet = web3.Keypair.fromSecretKey(bs58.decode(myPK))
    logger.info(`my account public key: ${wallet.publicKey.toString()}`);

    const airdropSignature = await connection.requestAirdrop(
        fromWallet.publicKey,
        web3.LAMPORTS_PER_SOL * 3,
    );
    //wait for airdrop confirmation
    await connection.confirmTransaction(airdropSignature);

    // get account info
    // account data is bytecode that needs to be deserialized
    // serialization and deserialization is program specic
    const account = await connection.getAccountInfo(wallet.publicKey);
    console.log(account);

    // Create new token mint
    const token = await splToken.Token.createMint(
        connection,
        fromWallet,                     // signer for paying fee
        fromWallet.publicKey,           // mint authority
        null,                       // freeze authority
        9,                          // decimals
        splToken.TOKEN_PROGRAM_ID,  // program id
    );
    
    // 为目标sol地址创建关联的token账户, if it does not exist, create it
    const fromTokenAccount = await token.getOrCreateAssociatedAccountInfo(
        fromWallet.publicKey,
    );
}

main().catch(e => {

})
import * as web3 from '@solana/web3.js';
import bs58 from 'bs58';

const main = async() => {
    const connection = new web3.Connection(
        web3.clusterApiUrl('devnet'),
        'confirmed',
    );
    // Generate a new wallet keypair and airdrop SOL
    const wallet = web3.Keypair.generate();
    console.log(wallet.publicKey.toString())
    console.log(wallet.secretKey)
    // 将私钥进行base58编码，编码后类型：string
    const secretKey = bs58.encode(wallet.secretKey);
    console.log(secretKey);
   
    // 从字符串私钥（先进行base58解码）加载账号
    const wallet2 = web3.Keypair.fromSecretKey(bs58.decode(secretKey))
    console.log(wallet2.publicKey.toString());

    const airdropSignature = await connection.requestAirdrop(
        wallet.publicKey,
        web3.LAMPORTS_PER_SOL,
    );
    //wait for airdrop confirmation
    await connection.confirmTransaction(airdropSignature);
    // get account info
    // account data is bytecode that needs to be deserialized
    // serialization and deserialization is program specic
    const account = await connection.getAccountInfo(wallet.publicKey);
    console.log(account);
}

main().catch(e => {

})
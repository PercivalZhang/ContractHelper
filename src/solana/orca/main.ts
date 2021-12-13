import { Connection, PublicKey } from "@solana/web3.js";
import { getOrca, OrcaFarmConfig, OrcaPoolConfig } from "@orca-so/sdk";
import Decimal from "decimal.js";

const main = async () => {

  // Initialzie Orca object with mainnet connection
  const connection = new Connection("https://api.mainnet-beta.solana.com", "singleGossip");
  const orca = getOrca(connection);

  try {
    //测试账户地址
    const ownerAddress = '4P9p1LRcJ7Mqo3eH7ww25z5VGVfHMEegWEsDhUTowuwS';
    const owner = new PublicKey(ownerAddress);
    /*** Swap ***/
    // We will be swapping 0.1 SOL for some USDC
    const usdcSolPool = orca.getPool(OrcaPoolConfig.SOL_USDC);
    // 获取LP Token包含的两个token信息
    const solToken = usdcSolPool.getTokenA();
    const usdcToken = usdcSolPool.getTokenB();
    console.log(`token A: ${solToken.tag}`);
    console.log(`token B: ${usdcToken.tag}`);
    // 获取pool token的供应量
    const lpSupply = await usdcSolPool.getLPSupply();
    console.log(`total pool tokens: ${lpSupply.toNumber()} USDC_SOL LP token`);
    // 获取用户poolToken数量
    const myLPBalance = await usdcSolPool.getLPBalance(owner);
    console.log(`my pool tokens: ${myLPBalance.toNumber()} USDC_SOL LP token`);
    // 获取0.1 SOL可以兑换USDC的数量
    const solAmount = new Decimal(0.1);
    const quote = await usdcSolPool.getQuote(solToken, solAmount);
    const usdcAmount = quote.getMinOutputAmount();
    console.log(`Swap ${solAmount.toString()} SOL for at least ${usdcAmount.toNumber()} USDC`);
    /*** Pool Deposit ***/
    // Deposit SOL and USDC for LP token
    const { maxTokenAIn, maxTokenBIn, minPoolTokenAmountOut } = await usdcSolPool.getDepositQuote(
        solAmount,
        usdcAmount,
    );
    console.log(
        `Deposit at most ${maxTokenBIn.toNumber()} USDC and ${maxTokenAIn.toNumber()} SOL, for at least ${minPoolTokenAmountOut.toNumber()} LP tokens`
    );

    /*** Farm ***/
    // Deposit some USDC_SOL LP token for farm token
    // poolToken --convert--> farmToken
    const usdcSolFarm = orca.getFarm(OrcaFarmConfig.SOL_USDC_AQ);

    /*** Farm Withdraw ***/
    // 获取用户参与挖矿的farmToken数量
    const myFarmBalance = await usdcSolFarm.getFarmBalance(owner); // withdraw the entire balance
    console.log(`my farm tokens: ${myFarmBalance.toNumber()} USDC_SOL LP token`);    

    /*** Pool Withdraw ***/
    // Withdraw SOL and ORCA, in exchange for ORCA_SOL LP token
    const withdrawTokenAmount = myLPBalance.toNumber() == 0 ? myFarmBalance : myLPBalance;
    const withdrawTokenMint = usdcSolPool.getPoolTokenMint();
    const { maxPoolTokenAmountIn, minTokenAOut, minTokenBOut } = await usdcSolPool.getWithdrawQuote(
        withdrawTokenAmount,
        withdrawTokenMint
    );
    console.log(
        `Withdraw at most ${maxPoolTokenAmountIn.toNumber()} USDC_SOL LP token for at least ${minTokenAOut.toNumber()} SOL and ${minTokenBOut.toNumber()} USDC`
    );
  } catch (err) {
    console.warn(err);
  }
};

main()
  .then(() => {
    console.log("Done");
  })
  .catch((e) => {
    console.error(e);
  });
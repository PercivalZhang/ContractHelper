import { u64 } from "@solana/spl-token";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { findAssociatedTokenAddress, deserializeAccount } from "./utils";
import BigNumber from 'bignumber.js';


/**
 * An Orca token-swap pool
 * @param address The pool account address
 * @param nonce The nonce used to generate the pool authority
 * @param authority The pool authority PDA address to sign instructions
 * @param poolTokenMint Mint address for the pool token
 * @param poolTokenDecimals Number of decimal places for the pool token
 * @param feeAccount Public address of the pool token fee account
 * @param tokenIds The ids of the tokens in this pool
 * @param tokens The id, token object of the tokens in this pool
 * @param curveType Trading curve type. 0 - ConstantProduct, 1 - ConstantPrice, 2 - Stable, 3 - Offset
 * @param feeStructure The % of fees collected by this pool
 * @param amp The amplification coefficient for a stable curve pool (defines how flat the AMM curve is when prices are similar)
 */
export type OrcaPoolParams = {
    address: PublicKey;
    authority: PublicKey;
    poolTokenMint: PublicKey;
    poolTokenDecimals: number;
};
export class OrcaPool {
  private connection: Connection;
  public readonly poolParams: OrcaPoolParams;

  constructor(connection: Connection, config: OrcaPoolParams) {
    this.connection = connection;
    this.poolParams = config;
  }

  public getPoolTokenMint(): PublicKey {
    return this.poolParams.poolTokenMint;
  }

  public async getLPBalance(owner: PublicKey): Promise<BigNumber> {
    const address = await findAssociatedTokenAddress(owner, this.poolParams.poolTokenMint);

    const accountInfo = await this.connection.getAccountInfo(address);

    // User does not have a balance for this account
    if (accountInfo == undefined) {
      return new BigNumber(0);
    }
    const result = deserializeAccount(accountInfo?.data);
    if (result == undefined) {
      throw new Error("Failed to parse user account for LP token.");
    }
    return new BigNumber(result.amount.toString());
  }

  public async getLPSupply(): Promise<BigNumber> {
    const context = await this.connection.getTokenSupply(this.poolParams.poolTokenMint);

    return new BigNumber(context.value.amount);
  }
}

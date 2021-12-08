import { PublicKey } from "@solana/web3.js";

/**
 * An Orca aquafarm token
 * @param address The farm account address
 * @param farmTokenMint Mint address for the farm token
 * @param rewardTokenMint Mint address for the farm reward token
 * @param rewardTokenDecimals Number of decimal places for the reward token
 * @param baseTokenMint Mint address for the base token
 * @param baseTokenDecimals Number of decimal places for the base token
 */
export interface OrcaFarmParams {
  address: PublicKey;
  farmTokenMint: PublicKey;
  rewardTokenMint: PublicKey;
  rewardTokenDecimals: number;
  baseTokenMint: PublicKey;
  baseTokenDecimals: number;
};

export const solUsdcAqFarm: OrcaFarmParams = Object.freeze({
    address: new PublicKey("85HrPbJtrN82aeB74WTwoFxcNgmf5aDNP2ENngbDpd5G"),
    farmTokenMint: new PublicKey("FFdjrSvNALfdgxANNpt3x85WpeVMdQSH5SEP2poM8fcK"),
    rewardTokenMint: new PublicKey("orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE"),
    rewardTokenDecimals: 6,
    baseTokenMint: new PublicKey("APDFRM3HMr8CAGXwKHiu2f5ePSpaiEJhaURwhsRrUUt9"),
    baseTokenDecimals: 6,
});
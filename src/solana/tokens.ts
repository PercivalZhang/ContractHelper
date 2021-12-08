import { PublicKey } from "@solana/web3.js";
/*
* @param tag The tag of the token
* @param name The presentable name of the token
* @param mint The mint public key for the token
* @param scale The scale of the u64 return type
*/
export type OrcaToken = {
 tag: string;
 name: string;
 mint: PublicKey;
 scale: number;
};

export const usdcToken: OrcaToken = Object.freeze({
    tag: "USDC",
    name: "USD Coin",
    mint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
    scale: 6,
});
export const solToken: OrcaToken = Object.freeze({
    tag: "SOL",
    name: "SOL",
    mint: new PublicKey("So11111111111111111111111111111111111111112"),
    scale: 9,
});
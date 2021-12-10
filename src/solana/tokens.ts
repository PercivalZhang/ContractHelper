import { PublicKey } from '@solana/web3.js';
import BigNumber from 'bignumber.js';
/*
 * @param tag The tag of the token
 * @param name The presentable name of the token
 * @param mint The mint public key for the token
 * @param scale The scale of the u64 return type
 */
export type ERC20Token = {
    tag: string;
    name: string;
    mint: PublicKey;
    scale: number;
};

export const usdcToken: ERC20Token = Object.freeze({
    tag: 'USDC',
    name: 'USD Coin',
    mint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
    scale: 6,
});
export const solToken: ERC20Token = Object.freeze({
    tag: 'SOL',
    name: 'SOL',
    mint: new PublicKey('So11111111111111111111111111111111111111112'),
    scale: 9,
});
export const readableAmount = (amount: BigNumber, scale: number, decimals?: number): number => {
    if(decimals) {
        return Number.parseFloat(amount.dividedBy(Math.pow(10, scale)).toNumber().toFixed(decimals));
    }
    return Number.parseFloat(amount.dividedBy(Math.pow(10, scale)).toNumber().toFixed(6));
};

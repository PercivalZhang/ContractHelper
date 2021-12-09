import { PublicKey } from '@solana/web3.js';
import { OrcaPoolParams } from './pool';
import { solToken, usdcToken } from './tokens';

export const solUSDCPool: OrcaPoolParams = Object.freeze({
    swap: new PublicKey('EGZ7tiLeH62TPV1gL8WwbXGzEPa9zmcpVnnkPKKnrE2U'),
    authority: new PublicKey('JU8kmKzDHF9sXWsnoznaFDFezLsE5uomX2JkRMbmsQP'),
    poolTokenMint: new PublicKey('APDFRM3HMr8CAGXwKHiu2f5ePSpaiEJhaURwhsRrUUt9'),
    poolTokenDecimals: 6,
    tokens: [solToken, usdcToken],
    vaults: [
        {
            token: solToken,
            tokenAccount: new PublicKey('ANP74VNsHwSrq9uUSjiSNyNWvf6ZPrKTmE4gHoNd13Lg'),
        },
        {
            token: usdcToken,
            tokenAccount: new PublicKey('75HgnSvXbWKZBpZHveX68ZzAhDqMzNDS29X6BGLtxMo1'),
        },
    ],
});

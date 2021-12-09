import { PublicKey } from '@solana/web3.js';
import { OrcaFarmParams } from './farm';

export const solUsdcAqFarm: OrcaFarmParams = Object.freeze({
    address: new PublicKey('85HrPbJtrN82aeB74WTwoFxcNgmf5aDNP2ENngbDpd5G'),
    farmTokenMint: new PublicKey('FFdjrSvNALfdgxANNpt3x85WpeVMdQSH5SEP2poM8fcK'),
    rewardTokenMint: new PublicKey('orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE'),
    rewardTokenDecimals: 6,
    baseTokenMint: new PublicKey('APDFRM3HMr8CAGXwKHiu2f5ePSpaiEJhaURwhsRrUUt9'),
    baseTokenDecimals: 6,
});

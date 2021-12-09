import { TOKEN_PROGRAM_ID, u64 } from '@solana/spl-token';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import Decimal from 'decimal.js';
import { findAssociatedTokenAddress, deserializeAccount } from './utils';
import BigNumber from 'bignumber.js';

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
}

export class OrcaFarm {
    private connection: Connection;
    public readonly farmParams: OrcaFarmParams;

    constructor(connection: Connection, config: OrcaFarmParams) {
        this.connection = connection;
        this.farmParams = config;
    }

    public async getFarmBalance(owner: PublicKey): Promise<BigNumber> {
        const address = await findAssociatedTokenAddress(owner, this.farmParams.farmTokenMint);

        const accountInfo = await this.connection.getAccountInfo(address);

        // User does not have a balance for this account
        if (accountInfo == undefined) {
            //return OrcaU64.fromNumber(0, this.farmParams.baseTokenDecimals);
            return new BigNumber(0);
        }
        const result = deserializeAccount(accountInfo?.data);
        console.log(result.address);
        if (result == undefined) {
            throw new Error('Failed to parse user account for LP token.');
        }
        return new BigNumber(result.amount.toString());
        //return OrcaU64.fromU64(result.amount, this.farmParams.baseTokenDecimals);
    }

    public async getFarmSupply(): Promise<BigNumber> {
        const context = await this.connection.getTokenSupply(this.farmParams.farmTokenMint);
        return new BigNumber(context.value.amount);
    }

    //   public async getDailyEmissions(): Promise<OrcaU64> {
    //     const { address, rewardTokenDecimals } = this.farmParams;

    //     const globalFarms = await fetchGlobalFarms(this.connection, [address], ORCA_FARM_ID);

    //     if (!globalFarms) {
    //       throw new Error("Failed to get globalFarms information");
    //     }

    //     const value = new Decimal(globalFarms[0].emissionsPerSecondNumerator.toString())
    //       .mul(60 * 60 * 24)
    //       .div(globalFarms[0].emissionsPerSecondDenominator.toString())
    //       .div(new Decimal(10).pow(rewardTokenDecimals));

    //     return OrcaU64.fromDecimal(value, rewardTokenDecimals);
    //   }
}

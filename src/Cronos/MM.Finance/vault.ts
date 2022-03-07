import { LoggerFactory } from '../../library/LoggerFactory';
import BigNumber from 'bignumber.js';
import { ContractHelper } from '../../library/contract.helper';
import { SwissKnife } from '../../library/swiss.knife';
import { NetworkType } from '../../library/web3.factory';
import { ERC20Token } from '../../library/erc20.token';

// https://cronos.org/explorer/address/0x6bE34986Fdd1A91e4634eb6b9F8017439b7b5EDc/read-contract
// usdt-usdc pid=6
// MMO-MMF double rewards
// MMF 23%左右
const network = NetworkType.CRONOS;

const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('vault');

type TokenBalance = {
    token: ERC20Token;
    balance: number;
};

export class Vault {
    public readonly address: string;
    public network: NetworkType;
    private vault: ContractHelper;
    private hideExceptionOutput: boolean;

    constructor(address: string, network: NetworkType) {
        this.vault = new ContractHelper(address, './Cronos/MM.Finance/vault.json', network);
        this.address = address;
        this.network = network;
        this.hideExceptionOutput = false;
    }

    public toggleHiddenExceptionOutput() {
        this.hideExceptionOutput = !this.hideExceptionOutput;
    }

    public async getVaultInfo() {
        const stakingTokenAddress = await this.vault.callReadMethod('stakingToken');
        const stakingToken = await swissKnife.syncUpTokenDB(stakingTokenAddress);
        logger.info(`getVaultInfo > staking Token - ${stakingToken.symbol}: ${stakingToken.address}`);

        const rewardTokenAddress = await this.vault.callReadMethod('rewardsToken');
        console.log(rewardTokenAddress);
        //const rewardToken = await swissKnife.syncUpTokenDB(rewardTokenAddress);
        //logger.info(`getVaultInfo > reward Token - ${rewardToken.symbol}: ${rewardToken.address}`);

        const rewardRate = await this.vault.callReadMethod('rewardRate');
        logger.info(`getVaultInfo > reward rate: ${rewardRate}`);
    }

    public async getUserInfo(userAddress: string) {
        const balance = await this.vault.callReadMethod('balanceOf', userAddress);
        logger.info(`my balance: ${balance}`);
        const rewards = await this.vault.callReadMethod('rewards', userAddress);
        console.log(rewards);
    }
}

const main = async () => {
    const vault = new Vault('0x55B5540B5C48a27FD17ebe2B9E6a06911f8aa45A', network);
    await vault.getVaultInfo();
    //await vault.getUserInfo('0x881897b1FC551240bA6e2CAbC7E59034Af58428a');
    // USDT-USDC LPT
    const lpt = new ContractHelper(
        '0x6F186E4BEd830D13DcE638e40bA27Fd6d91BAd0B',
        './Cronos/MM.Finance/lp.token.json',
        network,
    );
    const reserves = await lpt.callReadMethod('getReserves');
    console.log(reserves);
};

main().catch((e) => {
    logger.error(e.message);
});

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
        //获取质押LPToken的地址
        const stakingTokenAddress = await this.vault.callReadMethod('stakingToken');
        const stakingToken = await swissKnife.syncUpTokenDB(stakingTokenAddress);
        logger.info(`getVaultInfo > staking Token - ${stakingToken.symbol}: ${stakingToken.address}`);
        //获取质押LPToken的数量
        const balance = await this.vault.callReadMethod('balance');
        console.log(balance);
        logger.info(
            `getVaultInfo > total staked token balance: ${stakingToken.readableAmount(balance).toFixed(8)} ${
                stakingToken.symbol
            }`,
        );
        // const rewardDistAddress = await this.vault.callReadMethod('rewardsDistribution');
        // logger.info(
        //     `getVaultInfo > reward distribution address: ${rewardDistAddress}`
        // );
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
        const earned = await this.vault.callReadMethod('earned', userAddress);
        console.log(earned);
    }
}

const getRewards = async (pid: number) => {
    const mmoPrice = 6.64;
    const mmfPrice = 0.74;
    const croPrice = 0.387;
    const mmoPerCRO = 0.066;

    const masterChef = new ContractHelper(
        '0x6bE34986Fdd1A91e4634eb6b9F8017439b7b5EDc',
        './Cronos/MM.Finance/master.chef.json',
        network,
    );
    const poolInfo = await masterChef.callReadMethod('poolInfo', pid);
    const allocPoint = poolInfo['allocPoint'];
    const totalAllocPoint = await masterChef.callReadMethod('totalAllocPoint');
    const rewardPerBlock = await masterChef.callReadMethod('meerkatPerBlock');

    const annualRewardUSD = new BigNumber(rewardPerBlock)
        .multipliedBy(3600 * 24 * 365)
        .multipliedBy(mmfPrice)
        .multipliedBy(allocPoint)
        .dividedBy(totalAllocPoint)
        .dividedBy(1e18).dividedBy(6.5);
    
    const annualRewardPart1USD = annualRewardUSD.multipliedBy(0.7);
    const annualRewardPart2USD = annualRewardUSD.multipliedBy(0.3).multipliedBy(mmoPerCRO).multipliedBy(mmoPrice).dividedBy(croPrice);
    
    logger.info(`reward part1 USD: ${annualRewardPart1USD.toNumber().toFixed(4)}`);
    logger.info(`reward part2 USD: ${annualRewardPart2USD.toNumber().toFixed(4)}`)

};
const main = async () => {
    // vault: 0x00db5925892274f276846f25c7fe81dec3f3b769 pid=8 wbtc-weth
    // usdc-dai pid=11
    // 0x443ec402bec44da7138a54413b6e09037cf9cf41 MMF
    // vault:0x55B5540B5C48a27FD17ebe2B9E6a06911f8aa45A usdt-usdc LP pid=6
    //const vault = new Vault('0x55B5540B5C48a27FD17ebe2B9E6a06911f8aa45A', network); //usdt-usdc
    //await vault.getVaultInfo();
    await getRewards(6);
    //await vault.getUserInfo('0x881897b1FC551240bA6e2CAbC7E59034Af58428a');
};

main().catch((e) => {
    logger.error(e.message);
});

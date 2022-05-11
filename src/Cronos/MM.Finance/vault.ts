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
        logger.info(`getVaultInfo > vault: ${this.address}`);
        //获取质押LPToken的地址
        const stakingTokenAddress = await this.vault.callReadMethod('stakingToken');
        const stakingToken = await swissKnife.syncUpTokenDB(stakingTokenAddress);
        logger.info(`getVaultInfo > staking Token - ${stakingToken.symbol}: ${stakingToken.address}`);
        //获取质押LPToken的数量
        const balance = await this.vault.callReadMethod('balance');
        logger.info(
            `getVaultInfo > total staked token balance: ${stakingToken.readableAmount(balance).toFixed(8)} ${
                stakingToken.symbol
            }`,
        );

        const lpTokenDetails = await swissKnife.getLPTokenDetails(stakingTokenAddress);
        const stakedRatio = new BigNumber(balance).dividedBy(lpTokenDetails.totalSupply);

        const token0Amount = lpTokenDetails.reserve0.multipliedBy(stakedRatio);
        const token1Amount = lpTokenDetails.reserve1.multipliedBy(stakedRatio);
        logger.info(
            `getVaultInfo > staked token0 - ${lpTokenDetails.token0.symbol} : ${lpTokenDetails.token0
                .readableAmountFromBN(token0Amount)
                .toFixed(6)}`,
        );
        logger.info(
            `getVaultInfo > staked token1 - ${lpTokenDetails.token1.symbol} : ${lpTokenDetails.token1
                .readableAmountFromBN(token1Amount)
                .toFixed(6)}`,
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
        //获取质押LPToken的地址
        const stakingTokenAddress = await this.vault.callReadMethod('stakingToken');
        const stakingToken = await swissKnife.syncUpTokenDB(stakingTokenAddress);

        const balance = await this.vault.callReadMethod('balanceOf', userAddress);
        logger.info(
            `getUserInfo > my staked balance: ${stakingToken.readableAmount(balance).toFixed(18)} ${
                stakingToken.symbol
            }`,
        );

        // const result = await this.vault.callReadMethodWithFrom('getReward', userAddress);
        // console.log(result);

        // const rewards = await this.vault.callReadMethod('rewards', userAddress);
        // console.log(rewards);
        const earned = await this.vault.callReadMethod('earned', userAddress);
        console.log(earned);
    }
}

const getRewards = async (pid: number) => {
    const mmoPrice = 8.49;
    const mmfPrice = 1.022;
    const croPrice = 0.415;
    const mmoPerCRO = 0.049;

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
        .dividedBy(1e18)
        .dividedBy(6.5);

    const annualRewardPart1USD = annualRewardUSD.multipliedBy(0.7);
    const annualRewardPart2USD = annualRewardUSD
        .multipliedBy(0.3)
        .multipliedBy(mmoPerCRO)
        .multipliedBy(mmoPrice)
        .dividedBy(croPrice);

    logger.info(`reward part1 USD: ${annualRewardPart1USD.toNumber().toFixed(4)}`);
    logger.info(`reward part2 USD: ${annualRewardPart2USD.toNumber().toFixed(4)}`);
};
const main = async () => {
    // 0xb130a35acd62eb4604c6ba6479d660d97a0a5abe
    // vault: 0x00db5925892274f276846f25c7fe81dec3f3b769 pid=8 wbtc-weth user:0x169b0a0af452fe66ce28fdd4090652dd67444fb4
    // usdc-dai pid=11
    // 0x443ec402bec44da7138a54413b6e09037cf9cf41 MMF
    // vault:0x55B5540B5C48a27FD17ebe2B9E6a06911f8aa45A usdt-usdc LP pid=6
    const vault = new Vault('0xb130a35acd62eb4604c6ba6479d660d97a0a5abe', network);
    await vault.getVaultInfo();
    //await getRewards(6);
    // await vault.getUserInfo('0x881897b1FC551240bA6e2CAbC7E59034Af58428a');
};

main().catch((e) => {
    logger.error(e.message);
});

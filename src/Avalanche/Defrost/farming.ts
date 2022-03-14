import { LoggerFactory } from '../../library/LoggerFactory';
import BigNumber from 'bignumber.js';
import { ContractHelper } from '../../library/contract.helper';
import { SwissKnife } from '../../library/swiss.knife';
import { Config } from './Config';
import { ERC20Token } from '../../library/erc20.token';
import { SmeltSaving } from './smelt.saving';

type TokenBalance = {
    token: ERC20Token;
    balance: number;
};

const logger = LoggerFactory.getInstance().getLogger('farming');
const smeltSaving = SmeltSaving.getInstance(Config.smeltSavings);
const swissKnife = new SwissKnife(Config.network);

export class FarmingPool {
    public readonly address: string;
    private farm: ContractHelper;
    private hideExceptionOutput: boolean;
 
    private rewardToken: ERC20Token;
    private lpt: ERC20Token;

    constructor(address: string) {
        this.farm = new ContractHelper(address, './Avalanche/Defrost/defrost.farming.json', Config.network);
        this.address = address;
        this.hideExceptionOutput = false;
    }

    public toggleHiddenExceptionOutput() {
        this.hideExceptionOutput = !this.hideExceptionOutput;
    }
 
    public async getFarmInfo() {
        const meltToken = await swissKnife.syncUpTokenDB(Config.MELT);
        const smeltToken = await swissKnife.syncUpTokenDB(Config.SMELT);
        
        this.rewardToken = meltToken;
        const poolInfo = await this.farm.callReadMethod('getPoolInfo', 0);
        this.lpt = await swissKnife.syncUpTokenDB(poolInfo['lpToken']);
        logger.info(`getFarmInfo > staking LP Token - ${this.lpt.symbol}: ${this.lpt.address}`)

        const totalStakedLPTBalance = await this.farm.callReadMethod('totalStaked', 0);
        logger.info(`getFarmInfo > total staked - ${this.lpt.symbol}: ${this.lpt.readableAmount(totalStakedLPTBalance)}`);

        const totalStakedSMeltBalance = await this.farm.callReadMethod('boostTotalStaked');
        logger.info(`getFarmInfo > total staked - ${smeltToken.symbol} for boost: ${smeltToken.readableAmount(totalStakedSMeltBalance)}`);

        const mineInfo = await this.farm.callReadMethod('getMineInfo', 0);
        const rewardRate = meltToken.readableAmount(mineInfo[0]) // Melt一天释放量
        const rewardDuration = mineInfo[1] // 86400 一天
        const annualRewardMeltAmount = new BigNumber(rewardRate).multipliedBy(365);
        logger.info(`getFarmInfo > annual reward Melt: ${annualRewardMeltAmount.toNumber().toFixed(4)}`);
        const annualRewardMeltUSD = annualRewardMeltAmount.multipliedBy(Config.priceMelt);
        logger.info(`getFarmInfo > annual reward Melt USD: ${annualRewardMeltUSD.toNumber().toFixed(4)} USD`);
    }

    public async getExtraH20RewardInfo() {
        const h2o = await swissKnife.syncUpTokenDB(Config.H2O);
        const melt = await swissKnife.syncUpTokenDB(Config.MELT);
        //const h2oFarmAddress = await this.farm.callReadMethod('tokenFarm');
        //const h2oFarm = new ContractHelper(h2oFarmAddress, './Avalanche/Defrost/token.farm.json', Config.network);
        //获取H2O的奖励速率
        const mineInfo = await this.farm.callReadMethod('getBoostMineInfo');
        const rewardRate = h2o.readableAmount(mineInfo[0]) // 一天的H2O的释放量
        const rewardDuration = mineInfo[1] // 86400 一天

        //项目方假定H2O为1USD
        const annualRewardH2OUSD = new BigNumber(rewardRate).multipliedBy(365);
        logger.info(`getExtraH20RewardInfo > annual reward H2O: ${annualRewardH2OUSD.toNumber().toFixed(4)}`);

        const totalStakedSMeltBalance = await this.farm.callReadMethod('boostTotalStaked');
        const totalStakedMeltBalance = await smeltSaving.getMeltAmount(new BigNumber(totalStakedSMeltBalance));
        logger.info(`getExtraH20RewardInfo > total staked Melt: ${melt.readableAmountFromBN(totalStakedMeltBalance)}`);
        logger.info(`getExtraH20RewardInfo > Melt price: ${Config.priceMelt} USD`);
        const totalStakedMeltUSD = new BigNumber(melt.readableAmountFromBN(totalStakedMeltBalance)).multipliedBy(Config.priceMelt);
        logger.info(`getExtraH20RewardInfo > total staked Melt USD: ${totalStakedMeltUSD}`);

        const apr = annualRewardH2OUSD.dividedBy(totalStakedMeltUSD);
        logger.info(`getExtraH20RewardInfo > H2O extra farming APR: ${apr.multipliedBy(100).toNumber().toFixed(2)}%`);
    }

    public getUserReceipt = async (userAddress: string) => {
        const meltToken = await swissKnife.syncUpTokenDB(Config.MELT);
        const smeltToken = await swissKnife.syncUpTokenDB(Config.SMELT);

        //返回用户质押的LP Token的数量，以及可领取的奖励token的数量
        const rewardData = await this.farm.callReadMethod('getRewardInfo', userAddress);
        const stakedLPTBalance = rewardData[0];
        logger.info(`farming > staked ${this.lpt.symbol}: ${this.lpt.readableAmount(stakedLPTBalance)}`);
        const clamableRewards = rewardData[1];
        const lockedRewards = rewardData[2];
        //获取用户质押的SMelt Token的数量
        const stakedSMeltBalance = await this.farm.callReadMethod('boostStakedFor', userAddress);
        logger.info(`getUserReceipt > staked ${smeltToken.symbol}: ${smeltToken.readableAmount(stakedSMeltBalance)}`);
        

    };
}

const main = async () => {
    const farm = new FarmingPool(Config.farms.H203CRV)
    await farm.getFarmInfo();
    await farm.getExtraH20RewardInfo();
};

main().catch((e) => {
    logger.error(e.message);
});

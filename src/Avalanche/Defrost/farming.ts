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
    // Extra H2O Reward based on SMELT staking for Boosting
    public async getExtraH20RewardInfo() {
        const h2o = await swissKnife.syncUpTokenDB(Config.H2O);
        const melt = await swissKnife.syncUpTokenDB(Config.MELT);

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
        const h2oToken = await swissKnife.syncUpTokenDB(Config.H2O);
        const meltToken = await swissKnife.syncUpTokenDB(Config.MELT);
        const smeltToken = await swissKnife.syncUpTokenDB(Config.SMELT);

        //返回用户质押的LP Token的数量，以及可领取的奖励token - MELT的数量
        const rewardData = await this.farm.callReadMethod('getRewardInfo', 0, userAddress);
        const stakedLPTBalance = rewardData[0];
        logger.info(`getUserReceipt > staked LPToken - ${this.lpt.symbol}: ${this.lpt.readableAmount(stakedLPTBalance).toFixed(4)}`);
        const clamableRewards = rewardData[1];
        logger.info(`getUserReceipt > claimable reward - ${meltToken.symbol}: ${meltToken.readableAmount(clamableRewards).toFixed(4)}`);
        const lockedRewards = rewardData[2]; // 10% every 6 days
        logger.info(`getUserReceipt > locked  reward - ${meltToken.symbol}: ${meltToken.readableAmount(lockedRewards).toFixed(4)}`);

        //获取用户质押的sMELT的数量
        const stakedSMeltBalance = await this.farm.callReadMethod('boostStakedFor', userAddress);
        logger.info(`getUserReceipt > staked ${smeltToken.symbol} in boosting: ${smeltToken.readableAmount(stakedSMeltBalance).toFixed(4)}`);
        let claimableBoostRewards = '0';
        //获取用户质押sMELT产生的可领取奖励H2O的数量
        if(new BigNumber(stakedSMeltBalance).gt(0)) {
            claimableBoostRewards = await this.farm.callReadMethod('boostPendingReward', userAddress);
        }
        logger.info(`getUserReceipt > claimable reward - ${h2oToken.symbol}: ${h2oToken.readableAmount(claimableBoostRewards).toFixed(4)}`);
        let boostingEffect = 0.0;
        // boosted effect: requires min 1000 sMELT tokens
        if(smeltToken.readableAmount(stakedSMeltBalance) >= 1000) {
            //计算boosting APR因子，apr = baseAPR * （1 + boostingEffect）
            boostingEffect = 0.03 + (smeltToken.readableAmount(stakedSMeltBalance)/1000 - 1) * 0.01
        }
        logger.info(`getUserReceipt > my APR boosting effect: ${boostingEffect}`);
    };
}

const main = async () => {
    const farm = new FarmingPool(Config.farms.H203CRV)
    await farm.getFarmInfo();
    // await farm.getExtraH20RewardInfo();
    await farm.getUserReceipt('0x881897b1FC551240bA6e2CAbC7E59034Af58428a');
    //await smeltSaving.getAPRPlusAPY();
};

main().catch((e) => {
    logger.error(e.message);
});

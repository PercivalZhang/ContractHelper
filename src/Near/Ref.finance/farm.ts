import { connect, ConnectConfig, Near, Account } from "near-api-js";
import { LoggerFactory } from '../../library/LoggerFactory';
import { TokenDB } from '../db.token';
import { ProjectConfig as Config } from './config';
import { ChainConfig } from '../config';
import BigNumber from "bignumber.js";
import { ERC20Token } from "src/library/erc20.token";
import { PoolHelper, PoolInfo } from "./pool";

const logger = LoggerFactory.getInstance().getLogger('FarmHelper');

export type SeedInfo = {
    seed_id: string;
    seed_type: string,
    farms: string[],
    next_index: number,
    amount: string,
    min_deposit: string,
};

export type Farm = {
    farm_id: string,
    farm_kind: string,
    farm_status: string,
    seed_id: string,
    reward_token: string,
    start_at: number,
    reward_per_session: string,
    session_interval: number,
    total_reward: string,
    cur_round: number,
    last_round: number,
    claimed_reward: string,
    unclaimed_reward: string,
    beneficiary_reward: string
};

export type FarmInfo  = {
    name: string,
    tvl: TVL;
    poolId: number;
    rewardsPerWeek: TokenBalance[];
    rewardTokens: ERC20Token[];
    apr: string;
}

export type Receipt = {
    farm: FarmInfo,
    user: {
        shares: string,
        deposits: TokenBalance[],
        claimableRewards: TokenBalance[],
    }
    pool: PoolInfo
}

export type TVL = {
    shares: string,
    totalValue: string,
    balances: TokenBalance[]
}

export type TokenBalance = {
    token: ERC20Token,
    amount: string
}

const gTokenDB = TokenDB.getInstance(ChainConfig.mainnet);
const gPoolHelper = PoolHelper.getInstance(ChainConfig.mainnet);

export class FarmingHelper {
    private config: ConnectConfig
    private connected: boolean
    private near: Near;
    private defaultAccount: Account;

    constructor(config: ConnectConfig) {
        this.config = config;
        this.connected = false;
    }

    private async checkConnection() {
        if (!this.connected) {
            logger.warn(`checkConnecttion > no connection to Near network.`);
            await this.connectToNetwork()
        }
    }
    /**
     * 从farmId中提取poolId
     * @param farmId 
     * @returns 
     */
    private getPoolId(farmId: string): number {
        return Number.parseInt(farmId.slice(farmId.indexOf('@') + 1, farmId.lastIndexOf('#')));
    }

    public async connectToNetwork() {
        this.near = await connect(this.config);
        this.connected = true;
        logger.info(`connectToNetwork > connected to Near network - ${this.config.networkId}`);
        this.defaultAccount = await this.near.account(Config.account.default);
    }
    /**
     * 获取目标seed的详情
     * @param seedId - seedId：[accountId]@[poolId], eg. "v2.ref-finance.near@2801"
     * @returns 
     */
    public async getSeedInfo(seedId: string): Promise<SeedInfo> {
        await this.checkConnection();
        const seedInfo = await this.defaultAccount.viewFunction(Config.contract.farming, 'get_seed_info', { seed_id: seedId });
        return seedInfo;
    }
    /**
     * 获取seed关联的所有farms信息
     * @param seedId - 目标seed的seedId
     * @returns 
     */
    public async listFarmsBySeed(seedId: string): Promise<Farm[]> {
        await this.checkConnection();
        const farms = await this.defaultAccount.viewFunction(Config.contract.farming, 'list_farms_by_seed', { seed_id: seedId });
        return farms;
    }
    /**
     * 获取目标liquidity pool关联的所有farms信息
     * @param poolId 
     * @returns 
     */
    public async listFarmsByPoolId(poolId: number): Promise<Farm[]> {
        await this.checkConnection();
        //构造seedId
        const seedId = Config.contract.exchange + '@' + poolId;
        logger.info(`listFarmsByPoolId > seed: ${seedId}`);
        const farms = await this.defaultAccount.viewFunction(Config.contract.farming, 'list_farms_by_seed', { seed_id: seedId });
        logger.info(`listFarmsByPoolId > detected total ${farms.length} farms`);
        return farms;
    }
    /**
     * 获取指定farm的目标账户的待领取奖励数量
     * @param userAddress - 目标用户地址（accound Id）
     * @param farmId - 目标farm的编号
     * @returns 
     */
    public async getClaimableRewards(userAddress: string, farmId: string): Promise<string> {
        await this.checkConnection();
        const account = await this.near.account(userAddress);
        const claimableRewards = await account.viewFunction(Config.contract.farming, 'get_unclaimed_reward', { account_id: account.accountId, farm_id: farmId });
        return claimableRewards;
    }
    /**
     * 获取用户farming seeds列表
     * @param accountId 
     * @returns 
     */
    public async listUserSeeds(accountId: string) {
        await this.checkConnection();
        const account = await this.near.account(accountId);
        const userSeedData = await account.viewFunction(Config.contract.farming, 'list_user_seeds', { account_id: account.accountId });
        return userSeedData;
    }
    /**
     * 获取目标Liquidity Pool对应的Farm Pool的质押TVL
     * @param poolId - 目标LP的pid
     * @returns - Farm Pool总质押的两个token的数量
     */
    public async getFarmTVL(poolId: number): Promise<TVL>  {
        //获取质押在farming合约账户里的目标LP Token的数量(未处理decimals)
        const totalStakedShares = await gPoolHelper.getPoolShareBalance(poolId, Config.contract.farming);
        //获取目标LP(Liquidity Pool)的信息
        const poolInfo = await gPoolHelper.getPoolInfo(poolId);
        //计算质押farming的LP份额对应的token数量
        const balances = await gPoolHelper.getPoolBalanceDetails(poolInfo, totalStakedShares);
        //计算farm TVL = sharePrice * totalStakedShares
        logger.info(`getFarmTVL > pool[${poolId}] > share price: ${poolInfo.sharePrice}`)
        const totalValue = new BigNumber(poolInfo.sharePrice).multipliedBy(totalStakedShares).dividedBy(Math.pow(10, poolInfo.shareDecimals)).toNumber().toFixed(8);
        logger.info(`getFarmTVL > pool[${poolId}] > TVL: ${totalValue} USD`)
        return { balances, totalValue, shares: new BigNumber(totalStakedShares).dividedBy(Math.pow(10, poolInfo.shareDecimals)).toNumber().toFixed(8)};
    }

    public async getUserFarmingReceipts(accountId: string): Promise<Receipt[]> {
        const receipts: Receipt[] = [];
        try {
            await this.checkConnection();
            //获取用户seed和farming share balance
            const userSeedData = await this.listUserSeeds(accountId);
            //根据seedId遍历用户参与的所有farms
            //farming pool跟liquidity pool一一对应
            //每个seedId对应一个或多个farms
            //如果该farming pool有一个奖励token，那么该seedId就关联一个farm
            //如果该farming pool有多个奖励token，那么该seedId就关联多个farms
            for (const [seedId, shares] of Object.entries(userSeedData)) {
                logger.info(`seed[${seedId}] > shares: ${shares}`);
                //获取seedId关联的所有farming pool items
                const farms = await this.listFarmsBySeed(seedId);
                //console.log(farms);
                if (farms.length > 0) {
                    //从farmId中提取pool id
                    const poolId = this.getPoolId(farms[0].farm_id);
                    //根据poolId获取pool基本信息
                    const poolInfo = await gPoolHelper.getPoolInfo(poolId);
                    logger.info(`seed[${seedId}] > pool[${poolId}]: ${poolInfo.name}`);
                    //根据用户质押份额share的数量，计算用户质押的多个token的数量
                    const userDepositBalances = await gPoolHelper.getPoolBalanceDetails(poolInfo, new BigNumber(String(shares)));
                    //获取目标池子总共质押挖矿的share份额对应的多个token的数量
                    const farmTVLBalances = await this.getFarmTVL(poolId);
                    const receipt: Receipt = {
                        farm: {
                            name: poolInfo.name,
                            poolId: poolId,
                            tvl: farmTVLBalances,
                            rewardsPerWeek: [],
                            rewardTokens: [],
                            apr: "",
                        },
                        user: {
                            shares: new BigNumber(String(shares)).dividedBy(Math.pow(10, poolInfo.shareDecimals)).toNumber().toFixed(6),
                            deposits: userDepositBalances,
                            claimableRewards: [],
                        },
                        pool: poolInfo
                    }
                    //遍历所有farm pool item, 获取多个奖励token的信息
                    for (const farm of farms) {
                        //获取奖励token的metadata信息
                        const rewardToken = await gTokenDB.syncUp(farm.reward_token);
                        if (farm.farm_status === 'Running') { //只关注当前状态是“Running”的farm
                            receipt.farm.rewardTokens.push(rewardToken);
                            logger.info(`farm[${farm.farm_id}] > reward token - ${rewardToken.symbol}: ${rewardToken.address}`)
                        }
                        //获取目标farm里的待领取奖励token的数量
                        const claimableRewards = await this.getClaimableRewards(accountId, farm.farm_id)
                        //只收集待领取奖励不为0的记录
                        if(new BigNumber(claimableRewards).gt(0)) {
                            logger.info(`farm[${farm.farm_id}] > claimable reward - ${rewardToken.symbol}: ${rewardToken.readableAmount(claimableRewards).toFixed(8)}`)
                            receipt.user.claimableRewards.push({
                                token: rewardToken,
                                amount: rewardToken.readableAmount(claimableRewards).toFixed(8)
                            })
                        }
                    }
                    receipts.push(receipt);
                }
            }
            return receipts
        } catch(e) {
            logger.error(`getUserFarmingReceipts > ${e.message}`);
        }
    }
    /**
     * 获取目标liquidity pool的farming信息
     * @param poolId - LP Id
     * @returns 
     */
    public async getFarmInforByPoolId(poolId: number, decimals = 8): Promise<FarmInfo>  {
        try {
            const farms = await this.listFarmsByPoolId(poolId);
            if (farms.length > 0) {
                //根据poolId获取pool基本信息
                const poolInfo = await gPoolHelper.getPoolInfo(poolId);
                //获取目标池子总共质押挖矿的share份额对应的多个token的数量
                const farmTVLBalances = await this.getFarmTVL(poolId);
                const farmInfo: FarmInfo = {
                    name: poolInfo.name,
                    poolId: poolId,
                    tvl: farmTVLBalances,
                    rewardsPerWeek: [],
                    rewardTokens: [],
                    apr: "",
                }
                //farm的一年可获得奖励总价值 = sum(各个奖励token年价值)
                let totalAnnualRewardValue = new BigNumber(0);
                //遍历所有farm pool item, 获取多个奖励token的信息
                for (const farm of farms) {
                    if (farm.farm_status === 'Running') { //只关注当前状态是“Running”的farming pool
                        logger.info(`farm > ${farm.farm_id}`);
                        //获取奖励token的metadata信息
                        const rewardToken = await gTokenDB.syncUp(farm.reward_token);
                        farmInfo.rewardTokens.push(rewardToken);
                        logger.info(`getFarmInforByPoolId > farm[${farm.farm_id}] > reward token - ${rewardToken.symbol}: ${rewardToken.address}`)
                        //获取每周释放的奖励token数量
                        const rewardsPerWeek = new BigNumber(farm.reward_per_session).multipliedBy(3600 * 24 * 7).dividedBy(farm.session_interval)
                        logger.info(`getFarmInforByPoolId > farm[${farm.farm_id}] > rewards - ${rewardToken.symbol} weekly: ${rewardToken.readableAmountFromBN(rewardsPerWeek).toFixed(decimals)}`)
                        farmInfo.rewardsPerWeek.push({
                            token: rewardToken,
                            amount: rewardToken.readableAmountFromBN(rewardsPerWeek).toFixed(decimals)
                        })
                        //计算一年释放的奖励token的价值
                        const annulRewardValue = rewardsPerWeek.multipliedBy(52).multipliedBy(Config.prices[rewardToken.address]).dividedBy(Math.pow(10, rewardToken.decimals))
                        //累加计算farm的年奖励总价值
                        totalAnnualRewardValue  = totalAnnualRewardValue.plus(annulRewardValue)
                    }
                }
                //计算apr
                const apr = totalAnnualRewardValue.dividedBy(farmInfo.tvl.totalValue)
                logger.info(`getFarmInforByPoolId > pool[${poolId}] farm APR: ${apr.toNumber().toFixed(6)}`)
                farmInfo.apr = apr.multipliedBy(100).toNumber().toFixed(4) + '%'
                return farmInfo;
            }
        } catch(e) {
            logger.error(`getFarmInforByPoolId > ${e.message}`);
        }
    }
}

const main = async () => {
    const farmingHelper = new FarmingHelper(ChainConfig.mainnet)
    //const receipts = await farmingHelper.getUserFarmingReceipts('4a04621225d430f5939a265d4995c1e6cb60768c1a8e4c7b8a4da1f7fac982ce');
    //console.log(JSON.stringify(receipts));
    const farmInfo = await farmingHelper.getFarmInforByPoolId(3364)
    console.log(JSON.stringify(farmInfo))
};

main().catch((e) => {
    logger.error(e.message);
});

import { ContractHelper } from './contract.helper';
import { LoggerFactory } from './LoggerFactory';
import { NetworkType } from './web3.factory';
import { SwissKnife } from './swiss.knife';
import BigNumber from 'bignumber.js';

export interface ChefMethods {
    poolLength: string;
    userInfo: string;
    poolInfo: string;
    pendingReward: string;
    stakeToken: string;
}
export interface ChefPool {
    rewardToken: string;
}
export interface SyrupChefMetadata {
    address: string;
    methods: ChefMethods;
    pool: ChefPool;
}

const logger = LoggerFactory.getInstance().getLogger('master.chef');
/**
 * syrup pool/lauchpad pool
 * 质押一种token，通常是平台token，获取其他各种合作项目的token
 */
export class SyrupChefHelper {
    protected swissKnife: SwissKnife;
    protected chef: ContractHelper;
    protected chefMetadata: SyrupChefMetadata;
    public constructor(network: NetworkType, chefMetadata: SyrupChefMetadata, pathABIFile: string) {
        this.chef = new ContractHelper(chefMetadata.address, pathABIFile, network);
        this.chef.toggleHiddenExceptionOutput();
        this.chefMetadata = chefMetadata;
        this.swissKnife = new SwissKnife(network);
    }
    /**
     * 获取用户syrup poo挖矿的详情
     * @param userAddress 目标用户地址
     */
    public async getFarmingReceipts(userAddress: string, callback = null) {
        //获取质押池的数量
        const poolLength = await this.chef.callReadMethod(this.chefMetadata.methods.poolLength);
        logger.info(`total ${poolLength} pools`);
        let rewardToken = null;
        //遍历质押池
        for (let pid = 0; pid < poolLength; pid++) {
            //获取目标用户在质押池的质押信息
            const userInfo = await this.chef.callReadMethod(this.chefMetadata.methods.userInfo, pid, userAddress);
            const myStakedBalance = new BigNumber(userInfo.amount);
            //质押Token
            let stakeToken = null;
            if (myStakedBalance.gt(0)) {
                //获取质押Token信息
                if (stakeToken == null) {
                    const stakeTokenAddress = await this.chef.callReadMethod(this.chefMetadata.methods.stakeToken);
                    stakeToken = await this.swissKnife.syncUpTokenDB(stakeTokenAddress);
                    logger.info(`syrup pool: staking token - ${stakeToken.symbol}`);
                }
                //打印用户质押Token数量
                logger.info(
                    `pool[${pid}] > my staked token: ${myStakedBalance
                        .dividedBy(Math.pow(10, stakeToken.decimals))
                        .toNumber()
                        .toFixed(10)} ${stakeToken.symbol}`,
                );
                //获取质押池信息
                const poolInfo = await this.chef.callReadMethod(this.chefMetadata.methods.poolInfo, pid);
                // 奖励token单币
                //获取奖励token的地址
                const rewardTokenAddress = poolInfo[this.chefMetadata.pool.rewardToken];
                rewardToken = await this.swissKnife.syncUpTokenDB(rewardTokenAddress);
                logger.info(`pool[${pid}] > reward token - ${rewardToken.symbol} : ${rewardToken.address}`);
                //获取目标用户在当前质押池可领取的奖励token数量
                const pendingReward = await this.chef.callReadMethod(
                    this.chefMetadata.methods.pendingReward,
                    pid,
                    userAddress,
                );
                //callback是一个函数，用于处理奖励token的特殊案例，比如多个奖励token
                if (callback) {
                    callback(pendingReward);
                } else {
                    logger.info(
                        `pool[${pid}] > my pending reward: ${new BigNumber(pendingReward)
                            .dividedBy(Math.pow(10, rewardToken.decimals))
                            .toNumber()
                            .toFixed(8)} ${rewardToken.symbol}`,
                    );
                }
            }
        }
    }
}

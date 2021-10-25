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
    rewardToken: string;
}
export interface ChefPool {
    lpToken: string;
}
export interface MasterChefMetadata {
    address: string;
    methods: ChefMethods;
    pool: ChefPool;
}

const logger = LoggerFactory.getInstance().getLogger('master.chef');

export class MasterChefHelper {
    protected swissKnife: SwissKnife;
    protected chef: ContractHelper;
    public constructor(network: NetworkType, chefMetadata: MasterChefMetadata, pathABIFile: string) {
        this.chef = new ContractHelper(chefMetadata.address, pathABIFile, network);
        this.chef.toggleHiddenExceptionOutput();
        this.swissKnife = new SwissKnife(network);
    }
    /**
     * 获取用户master chef挖矿的详情
     * 对应UI： Farm（双币LP）和Pool（单币LP）
     * @param userAddress 目标用户地址
     */
    public async getFarmingReceipts(userAddress: string, chefMetadata: MasterChefMetadata, callback = null) {
        //获取质押池的数量
        const poolLength = await this.chef.callReadMethod(chefMetadata.methods.poolLength);
        logger.info(`total ${poolLength} pools`);
        //遍历质押池
        for (let pid = 0; pid < poolLength; pid++) {
            //获取目标用户在质押池的质押信息
            const userInfo = await this.chef.callReadMethod(chefMetadata.methods.userInfo, pid, userAddress);
            const myStakedBalance = new BigNumber(userInfo.amount);
            if (myStakedBalance.gt(0)) {
                const poolInfo = await this.chef.callReadMethod(chefMetadata.methods.poolInfo, pid);
                const lpTokenAddress = poolInfo[chefMetadata.pool.lpToken];
                const isPairedLPToken = await this.swissKnife.isLPToken(lpTokenAddress);
                //质押token是UNI paired lp token
                if (isPairedLPToken) {
                    const lpToken = await this.swissKnife.getLPTokenDetails(lpTokenAddress);
                    logger.info(
                        `pool[${pid}] > my staked token: ${myStakedBalance
                            .dividedBy(Math.pow(10, 18))
                            .toNumber()
                            .toFixed(10)} ${lpToken.token0.symbol}/${lpToken.token1.symbol} LP`,
                    );
                } else {
                    //质押token是单币erc20质押
                    const erc20Token = await this.swissKnife.syncUpTokenDB(lpTokenAddress);
                    logger.info(
                        `pool[${pid}] > my staked token: ${myStakedBalance
                            .dividedBy(Math.pow(10, erc20Token.decimals))
                            .toNumber()
                            .toFixed(10)} ${erc20Token.symbol}`,
                    );
                }
                //获取目标用户在当前质押池可领取的奖励token数量
                const pendingReward = await this.chef.callReadMethod(
                    chefMetadata.methods.pendingReward,
                    pid,
                    userAddress,
                );
                //callback是一个函数，用于处理奖励token的特殊案例，比如多个奖励token
                if (callback) {
                    callback(pendingReward);
                } else {
                    // 奖励token单币
                    //获取奖励token的地址
                    const rewardTokenAAddress = await this.chef.callReadMethod(chefMetadata.methods.rewardToken);
                    const rewardToken = await this.swissKnife.syncUpTokenDB(rewardTokenAAddress);
                    logger.info(`reward token - ${rewardToken.symbol} : ${rewardToken.address}`);
                    logger.info(
                        `pool[${pid}] > my pending reward: ${pendingReward
                            .dividedBy(Math.pow(10, rewardToken.decimals))
                            .toNumber()
                            .toFixed(8)} ${rewardToken.symbol}`,
                    );
                }
            }
        }
    }
}

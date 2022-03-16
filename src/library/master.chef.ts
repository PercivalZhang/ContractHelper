import { ContractHelper } from './contract.helper';
import { LoggerFactory } from './LoggerFactory';
import { NetworkType } from './web3.factory';
import { SwissKnife } from './swiss.knife';
import BigNumber from 'bignumber.js';
import { ERC20Token } from './erc20.token';

export type ChefMethods = {
    poolLength: string;
    userInfo: string;
    poolInfo: string;
    pendingReward: string;
    rewardToken: string;
    totalAllocPoint: string;
};
export type ChefPool = {
    lpToken: string;
    allocPoint: string;
};
export type MasterChefMetadata = {
    address: string;
    methods: ChefMethods;
    pool: ChefPool;
};
export type TokenReceipt = {
    token: ERC20Token;
    balance: number;
};
export type PoolReceipt = {
    myRatio: number;
    receipts: TokenReceipt[];
};
const logger = LoggerFactory.getInstance().getLogger('master.chef');

export class MasterChefHelper {
    protected swissKnife: SwissKnife;
    protected chef: ContractHelper;
    protected chefMetadata: MasterChefMetadata;
    protected network: NetworkType;
    public constructor(network: NetworkType, chefMetadata: MasterChefMetadata, pathABIFile: string) {
        this.network = network;
        this.chef = new ContractHelper(chefMetadata.address, pathABIFile, network);
        this.chef.toggleHiddenExceptionOutput();
        this.chefMetadata = chefMetadata;
        this.swissKnife = new SwissKnife(network);
    }
    public async getFarmingReceipts(userAddress: string) {
        return await this.getFarmingReceiptsWithCallbacks(userAddress, null, null);
    }
    /**
     * 获取用户master chef挖矿的详情
     * 对应UI： Farm（双币LP）和Pool（单币LP）
     * @param userAddress 目标用户地址
     */
    public async getFarmingReceiptsWithCallbacks(
        userAddress: string,
        callbackLPTHandler,
        callbackRewardHandler = null,
    ) {
        //获取质押池的数量
        // 配置文件指定了poolLength的数值，而不是合约方法名字
        const sizeRe = /:(\d+)/g;
        const sizeData = sizeRe.exec(this.chefMetadata.methods.poolLength);
        let poolLength = 0;
        if (sizeData != null) {
            poolLength = Number.parseInt(sizeData[1]);
        } else {
            poolLength = await this.chef.callReadMethod(this.chefMetadata.methods.poolLength);
        }
        logger.info(`total ${poolLength} pools`);
        let rewardToken = null;
        //遍历质押池
        for (let pid = 0; pid < poolLength; pid++) {
            //获取目标用户在质押池的质押信息
            const userInfo = await this.chef.callReadMethod(this.chefMetadata.methods.userInfo, pid, userAddress);
            const myStakedBalance = new BigNumber(userInfo['0']);
            if (myStakedBalance.gt(0)) {
                const poolInfo = await this.chef.callReadMethod(this.chefMetadata.methods.poolInfo, pid);
                const lpTokenAddress = poolInfo[this.chefMetadata.pool.lpToken];
                const isPairedLPToken = await this.swissKnife.isLPToken(lpTokenAddress);
                //质押token是UNI paired lp token
                if (isPairedLPToken) {
                    logger.info(`detected paired LP Token - ${lpTokenAddress}`);
                    const lpTokenDetails = await this.swissKnife.getLPTokenDetails(lpTokenAddress);
                    const token0 = lpTokenDetails.token0;
                    const token1 = lpTokenDetails.token1;
                    const lpt = new ContractHelper(lpTokenAddress, './pair.json', this.network);
                    const totalStakedLPT = await lpt.callReadMethod('balanceOf', this.chefMetadata.address);
                    const myRatio = myStakedBalance.dividedBy(totalStakedLPT);
                    const myToken0 = token0.readableAmountFromBN(lpTokenDetails.reserve0.multipliedBy(myRatio));
                    const myToken1 = token1.readableAmountFromBN(lpTokenDetails.reserve1.multipliedBy(myRatio));
                    logger.info(
                        `pool[${pid}] > my staked LP Token: ${myStakedBalance
                            .dividedBy(Math.pow(10, 18))
                            .toNumber()
                            .toFixed(10)} ${token0.symbol}/${token1.symbol} LP Token`,
                    );
                    logger.info(`pool[${pid}] > my staked token0: ${myToken0} ${token0.symbol}`);
                    logger.info(`pool[${pid}] > my staked token1: ${myToken1} ${token1.symbol}`);
                } else if (callbackLPTHandler) {
                    await callbackLPTHandler(pid, lpTokenAddress, myStakedBalance);
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
                    this.chefMetadata.methods.pendingReward,
                    pid,
                    userAddress,
                );
                //callback是一个函数，用于处理奖励token的特殊案例，比如多个奖励token
                if (callbackRewardHandler) {
                    await callbackRewardHandler(pid, pendingReward);
                } else {
                    if (!rewardToken) {
                        // 奖励token单币
                        //获取奖励token的地址
                        const rewardTokenAddress = await this.chef.callReadMethod(
                            this.chefMetadata.methods.rewardToken,
                        );
                        rewardToken = await this.swissKnife.syncUpTokenDB(rewardTokenAddress);
                        logger.info(`reward token - ${rewardToken.symbol} : ${rewardToken.address}`);
                    }
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
    public async getPoolInfo(pid: number): Promise<any> {
        return await this.chef.callReadMethod(this.chefMetadata.methods.poolInfo, pid);
    }
    public async getPoolLPTBalance(pid: number): Promise<BigNumber> {
        const poolInfo = await this.getPoolInfo(pid);
        const lptAddress = poolInfo[this.chefMetadata.pool.lpToken];
        const lpToken = new ContractHelper(lptAddress, './erc20.json', this.network);
        const totalStakedLPT = new BigNumber(await lpToken.callReadMethod('balanceOf', this.chefMetadata.address));
        return totalStakedLPT;
    }
    public async getAPY(pid: number, poolTotalUSD: BigNumber, annualRewardUSD: BigNumber): Promise<any> {
        //const totalAllocPoint = await this.chef.callReadMethod(this.chefMetadata.methods.totalAllocPoint);
        const totalAllocPoint = 100;
        logger.info(`total alloc poin: ${totalAllocPoint}`);
        const poolInfo = await this.chef.callReadMethod(this.chefMetadata.methods.poolInfo, pid);
        const poolAllocPoint = poolInfo[this.chefMetadata.pool.allocPoint];
        logger.info(`pool[${pid}] alloc point: ${poolAllocPoint}`);

        const poolRewardRatio = poolAllocPoint / totalAllocPoint;

        const apy = annualRewardUSD.multipliedBy(poolRewardRatio).dividedBy(poolTotalUSD);
        logger.info(`pool[]: APY: ${apy.toNumber().toFixed(4)}`);
    }

    public async getRewardRate(methodName: string): Promise<string> {
        const rewardRate = await this.chef.callReadMethod(methodName);
        return rewardRate;
    }

    public async getUserPoolReceipt(pid: number, userAddress: string, callbackLPTHandler = null): Promise<PoolReceipt> {
        const poolReceipt: PoolReceipt = {
            myRatio: 0,
            receipts: [],
        };
        try {
            //获取目标用户在质押池的质押信息
            const userInfo = await this.chef.callReadMethod(this.chefMetadata.methods.userInfo, pid, userAddress);
            console.log(userInfo);
            const myStakedBalance = new BigNumber(userInfo['0']);
            if (myStakedBalance.gt(0)) {
                const poolInfo = await this.chef.callReadMethod(this.chefMetadata.methods.poolInfo, pid);
                const lpTokenAddress = poolInfo[this.chefMetadata.pool.lpToken];
                const isPairedLPToken = await this.swissKnife.isLPToken(lpTokenAddress);
                //质押token是UNI paired lp token
                if (isPairedLPToken) {
                    logger.info(`detected paired LP Token - ${lpTokenAddress}`);
                    const lpTokenDetails = await this.swissKnife.getLPTokenDetails(lpTokenAddress);
                    console.log(lpTokenDetails);
                    const token0 = lpTokenDetails.token0;
                    const token1 = lpTokenDetails.token1;
                    const lpt = new ContractHelper(lpTokenAddress, './pair.json', this.network);
                    const totalStakedLPT = await lpt.callReadMethod('balanceOf', this.chefMetadata.address);
                    const myRatio = myStakedBalance.dividedBy(totalStakedLPT);
                    const myToken0 = token0.readableAmountFromBN(lpTokenDetails.reserve0.multipliedBy(myRatio));
                    const myToken1 = token1.readableAmountFromBN(lpTokenDetails.reserve1.multipliedBy(myRatio));
                    logger.info(
                        `pool[${pid}] > my staked LP Token: ${myStakedBalance
                            .dividedBy(Math.pow(10, 18))
                            .toNumber()
                            .toFixed(10)} ${token0.symbol}/${token1.symbol} LP Token`,
                    );
                    logger.info(`pool[${pid}] > my staked token0: ${myToken0} ${token0.symbol}`);
                    logger.info(`pool[${pid}] > my staked token1: ${myToken1} ${token1.symbol}`);
                    poolReceipt.myRatio = Number.parseFloat(myRatio.toNumber().toFixed(8));
                    poolReceipt.receipts.push({
                        token: token0,
                        balance: myToken0,
                    });
                    poolReceipt.receipts.push({
                        token: token1,
                        balance: myToken1,
                    });
                } else if (callbackLPTHandler) {
                    await callbackLPTHandler(lpTokenAddress, myStakedBalance);
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
                return poolReceipt;
            }
            return null;
        } catch (e) {
            logger.error(`getUserPoolReceipt > ${e.message}`);
        }
    }
}

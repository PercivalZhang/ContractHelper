import { ContractHelper } from '../library/contract.helper';
import { LoggerFactory } from '../library/LoggerFactory';
import { NetworkType } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';
import BigNumber from 'bignumber.js';
import { stringify } from 'querystring';
import * as fs from 'fs';
import path from 'path';
import * as lineReader from 'line-reader';
import { sleep } from 'sleep';

const network = NetworkType.POLYGON;

const swissKnife = new SwissKnife(network);

const logger = LoggerFactory.getInstance().getLogger('main');

interface PoolInfo {
    pid: number;
    poolToken: string;
    collateral: string;
    borrowable0: string;
    borrowable1: string;
}

const Config = {
    address: {
        factory: '0xbb92270716c8c424849f17ccc12f4f24ad4064d6',
    },
};
/**
 * 获取抵押资产的收据
 * collateral --exchangeRate --> staked UNI LP --exchangeRate--> UNI LP
 * @param poolInfo 
 * @param userAddress 
 * @returns 
 */
const getCollateralReceipt = async (poolInfo: PoolInfo, userAddress: string) => {
    const collateral = new ContractHelper(poolInfo.collateral, './Impermax/collateral.json', network);
    const collateralToken = await swissKnife.syncUpTokenDB(poolInfo.collateral);

    const myCollateralBalance = new BigNumber(await collateral.callReadMethod('balanceOf', userAddress));

    if (myCollateralBalance.gt(0)) {
        logger.info(`pool[${poolInfo.pid}]: ${poolInfo.poolToken}`);
        logger.info(`pool[${poolInfo.pid}] > collateral token - ${collateralToken.symbol}: ${poolInfo.collateral}`);
        //获取staked LP Token的地址
        const underlying = await collateral.callReadMethod('underlying');
        const stakedLPT = new ContractHelper(underlying, './Impermax/staked.lpt.json', network);
        const stakedLPToken = await swissKnife.syncUpTokenDB(underlying);
        // token0
        const token0Address = await stakedLPT.callReadMethod('token0');
        const token0 = await swissKnife.syncUpTokenDB(token0Address);
        // token1
        const token1Address = await stakedLPT.callReadMethod('token1');
        const token1 = await swissKnife.syncUpTokenDB(token1Address);
        //获取collateral token与staked LP token的兑换率
        const exchangeRateOfCollateral = await collateral.callReadMethod('exchangeRate');
        //获取staked LP token与LP token的兑换率
        const exchangeRateOfStakedLPT = await stakedLPT.callReadMethod('exchangeRate');
        console.log(exchangeRateOfStakedLPT);

        //通过兑换率换算出staked LP token的数量
        const myStakedLPTBalance = myCollateralBalance
            .multipliedBy(exchangeRateOfCollateral)
            .dividedBy(Math.pow(10, 18));

        //通过兑换率换算出实际LP token的数量
        const myLPTBalance = myStakedLPTBalance.multipliedBy(exchangeRateOfStakedLPT).dividedBy(Math.pow(10, 18));

        logger.info(
            `pool[${poolInfo.pid}] > my collateral cToken balance: ${myCollateralBalance
                .dividedBy(Math.pow(10, collateralToken.decimals))
                .toNumber()} ${collateralToken.symbol}`,
        );
        logger.info(
            `pool[${poolInfo.pid}] > my staked cToken balance: ${myStakedLPTBalance
                .dividedBy(Math.pow(10, stakedLPToken.decimals))
                .toNumber()} ${stakedLPToken.symbol}`,
        );
        logger.info(
            `pool[${poolInfo.pid}] > my LP token balance: ${myLPTBalance.dividedBy(Math.pow(10, 18)).toNumber()} ${
                token0.symbol
            }/${token1.symbol} LP`,
        );
        return true;
    }
    return false;
};
const getBorrowableReceipt = async (poolInfo: PoolInfo, userAddress: string) => {
    const borrowable0 = new ContractHelper(poolInfo.borrowable0, './Impermax/borrowable.json', network);
    const underlying0 = await borrowable0.callReadMethod('underlying');
    const underlyingToken0 = await swissKnife.syncUpTokenDB(underlying0);
    const myBorrowBalance0 = new BigNumber(await borrowable0.callReadMethod('borrowBalance', userAddress));
    if(myBorrowBalance0.gt(0)) {
        logger.info(
            `pool[${poolInfo.pid}] > borrowed ${myBorrowBalance0
                .dividedBy(Math.pow(10, underlyingToken0.decimals))
                .toNumber()
                .toFixed(8)} ${underlyingToken0.symbol}`,
        );
    }

    const borrowable1 = new ContractHelper(poolInfo.borrowable1, './Impermax/borrowable.json', network);
    const underlying1 = await borrowable1.callReadMethod('underlying');
    const underlyingToken1 = await swissKnife.syncUpTokenDB(underlying1);
    const myBorrowBalance1 = new BigNumber(await borrowable1.callReadMethod('borrowBalance', userAddress));
    if(myBorrowBalance1.gt(0)) {
        logger.info(
            `pool[${poolInfo.pid}] > borrowed ${myBorrowBalance1
                .dividedBy(Math.pow(10, underlyingToken1.decimals))
                .toNumber()
                .toFixed(8)} ${underlyingToken1.symbol}`,
        );
    }
};
/**
 * 获取用户存款收据
 * - 对应UI中的Lending
 * - 对应合约中的Borrowable
 * @param vaultAddress // 金库地址
 * @param userAddress  // 用户地址
 */
const getLendAndBorrowReceipt = async (vaultAddress: string, userAddress: string) => {
    const borrowable = new ContractHelper(vaultAddress, './Impermax/borrowable.json', network);
    //获取资产token信息
    const underlying = await borrowable.callReadMethod('underlying');
    const underlyingToken = await swissKnife.syncUpTokenDB(underlying);
    //获取存款凭证token信息
    const myLendBalance = new BigNumber(await borrowable.callReadMethod('balanceOf', userAddress));
    //获取借款凭证token信息
    const myBorrowBalance = new BigNumber(await borrowable.callReadMethod('borrowBalance', userAddress));
    if (myLendBalance.gt(0)) {
        // get exchange rate between borrowable token and underlying token
        const exchangeRateLast = await borrowable.callReadMethod('exchangeRateLast');
        logger.info(
            `vault[${vaultAddress}] > lent ${myLendBalance
                .multipliedBy(exchangeRateLast)
                .dividedBy(Math.pow(10, 18))
                .dividedBy(Math.pow(10, underlyingToken.decimals))
                .toNumber()
                .toFixed(8)} ${underlyingToken.symbol}`,
        );
    }
    if (myBorrowBalance.gt(0)) {
        // get exchange rate between borrowable token and underlying token
        const exchangeRateLast = await borrowable.callReadMethod('exchangeRateLast');
        logger.info(
            `vault[${vaultAddress}] > borrowed ${myBorrowBalance
                .multipliedBy(exchangeRateLast)
                .dividedBy(Math.pow(10, 18))
                .dividedBy(Math.pow(10, underlyingToken.decimals))
                .toNumber()
                .toFixed(8)} ${underlyingToken.symbol}`,
        );
    }
};
const getPositionReceipt = async (userAddress: string) => {
    const factory = new ContractHelper(Config.address.factory, './Impermax/factory.json', network);
    factory.toggleHiddenExceptionOutput();

    const lendingPoolsLength = await factory.callReadMethod('allLendingPoolsLength');
    logger.info(`total ${lendingPoolsLength} lending pools`);
    const vaults = new Set<string>();
    const pathPoolSetFile = path.resolve('data', 'borrowable.txt');
    const required = !fs.existsSync(pathPoolSetFile);
    for (let pid = 0; pid < lendingPoolsLength; pid++) {
        const poolAddress = await factory.callReadMethod('allLendingPools', pid);

        const poolData = await factory.callReadMethod('getLendingPool', poolAddress);
        const poolInfo: PoolInfo = {
            pid: poolData.lendingPoolId,
            poolToken: poolAddress,
            collateral: poolData.collateral,
            borrowable0: poolData.borrowable0,
            borrowable1: poolData.borrowable1,
        };

        logger.debug(`scanning lending pool[${poolInfo.pid}]: ${poolInfo.collateral}`);
        const hasCollateral = await getCollateralReceipt(poolInfo, userAddress);
        if (hasCollateral) {
            await getBorrowableReceipt(poolInfo, userAddress);
        }
    }

    // for(const vault of vaults) {
    //     //getLendReceipt(vault, userAddress);
    // }
};
const reloadPools = async () => {
    const factory = new ContractHelper(Config.address.factory, './Impermax/factory.json', network);
    factory.toggleHiddenExceptionOutput();

    const lendingPoolsLength = await factory.callReadMethod('allLendingPoolsLength');
    logger.info(`total ${lendingPoolsLength} lending pools`);
    const pathPoolSetFile = path.resolve('data', 'borrowable.txt');

    const vaults = new Set<string>();
    for (let pid = 0; pid < lendingPoolsLength; pid++) {
        const poolAddress = await factory.callReadMethod('allLendingPools', pid);
        logger.info(`add pool[${pid}] - ${poolAddress} to data file: borrowable.txt`);
        fs.writeFileSync(pathPoolSetFile, poolAddress + '\n', { flag: 'a+' });

        const poolData = await factory.callReadMethod('getLendingPool', poolAddress);
        vaults.add(poolData.borrowable0);
        vaults.add(poolData.borrowable1);
    }

    for (const vault of vaults) {
        logger.info(`add vault - ${vault} to data file: vaults.txt`);
        fs.writeFileSync(path.resolve('data', 'vaults.txt'), vault + '\n', { flag: 'a+' });
    }
};
const main = async () => {
    // await reloadPools();
    await getPositionReceipt('0xD2050719eA37325BdB6c18a85F6c442221811FAC');
    // let i = 0;
    // lineReader.eachLine(path.resolve('data/vaults.txt'), function (vault, last) {
    //     sleep(1);
    //     if (vault.trim().length > 0) {
    //         if (i % 10 === 0) {
    //             logger.warn(`scanned line[${i}] - ${vault}`);
    //         }
    //         getLendAndBorrowReceipt(vault, '0xD2050719eA37325BdB6c18a85F6c442221811FAC');
    //         i = i + 1;
    //     }
    //     // do whatever you want with line...
    //     if (last) {
    //         // or check if it's the last one
    //         console.log('+++++++++++++++DONE++++++++++++++++');
    //     }
    // });
};

main().catch((e) => {
    logger.error(e.message);
});

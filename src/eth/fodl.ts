import { ContractHelper } from '../library/contract.helper';
import { LoggerFactory } from '../library/LoggerFactory';
import { NetworkType, Web3Factory } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';
import BigNumber from 'bignumber.js';
import * as fs from 'fs';
import path from 'path';
import nReadlines = require('n-readlines');
import { ERC20Token } from '../library/erc20.token';
import { userInfo } from 'os';
import Web3 from 'web3';
import { JSONDBBuilder } from '../library/db.json';
// betaBank: https://cn.etherscan.com/address/0x972a785b390d05123497169a04c72de652493be1#readProxyContract

const network = NetworkType.ETH_MAIN;

const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('main');

const reserveDB = new JSONDBBuilder(path.resolve('db/fodl.reserves.db'), true, true, '/');

const Config = {
    FODL: '0x4c2e59d098df7b6cbae0848d66de2f8a4889b9c3',
    bank: '0x972a785b390d05123497169a04c72de652493be1',
    lendingPool: '0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9',
    accountNFT: '0xb410075e1e13c182475b2d0ece9445f2710ab197',
    staking: {
        SLP_FODL_USDC: '0xf958a023d5b1e28c32373547bdde001cad17e9b4',
        SLP_FODL_ETH: '0xa7453338ccc29e4541e6c6b0546a99cc6b9eb09a',
    },
};
const fetchAllReservesToDB = async () => {
    const pool = new ContractHelper(Config.lendingPool, './Fodl/lending.pool.json', network);
    const reserves = await pool.callReadMethod('getReservesList');
    logger.info(`detected total ${reserves.length} reserves`);
    for (const reserve of reserves) {
        const reserveData = await pool.callReadMethod('getReserveData', reserve)
        reserveDB.push('/' + reserve.toLowerCase(), {
            aToken: reserveData['7'],
            stableDebtTokenAddress: reserveData['8'],
            variableDebtTokenAddress: reserveData['9']
        });
        logger.info(`added reserve - ${reserve} data into db`);
    }
    logger.info(`>>>>>> add total ${reserves.length} reserve data items into db/fodl.reserves.db <<<<<<<`);
};
const getPositionReceipts = async (userAddress: string) => {
    const pool = new ContractHelper(Config.lendingPool, './Fodl/lending.pool.json', network);
    const accountNFT = new ContractHelper(Config.accountNFT, './Fodl/account.nft.json', network);
    const length = Number.parseInt(await accountNFT.callReadMethod('balanceOf', userAddress));
    if (length > 0) {
        logger.info(`[${userAddress}] > detected ${length} position nft`);
        for (let i = 0; i < length; i++) {
            const tokenId = await accountNFT.callReadMethod('tokenOfOwnerByIndex', userAddress, i);
            const fodlAccount = swissKnife.getWeb3().utils.toHex(tokenId);
            logger.info(`[${userAddress}] > fodl account: ${fodlAccount}`);
            const userAccountData = await pool.callReadMethod('getUserAccountData', fodlAccount);
            const collateralInETH = new BigNumber(userAccountData['totalCollateralETH']);
            const healthFactor = userAccountData['healthFactor'];
            if(collateralInETH.gt(0)) {
                const reserveItems = await reserveDB.getData('/');
                for (const [reserve, reserveData] of Object.entries(reserveItems)) {
                    logger.info(`searching reserve - ${reserve} ...`)
                    const aTokenHelper = new ContractHelper(reserveData['aToken'], './Fodl/aToken.json', network);
                    const aToken = await swissKnife.syncUpTokenDB(reserveData['aToken']);
                    const aTokenBalance = new BigNumber(await aTokenHelper.callReadMethod('balanceOf', fodlAccount));
                    if(aTokenBalance.gt(0)) {
                        logger.info(`my collateral balance: ${aToken.readableAmountFromBN(aTokenBalance).toFixed(6)} ${aToken.symbol}`);
                    }

                    const vDebtTokenHelper = new ContractHelper(reserveData['variableDebtTokenAddress'], './Fodl/variable.debt.token.json', network);
                    const vDebtToken = await swissKnife.syncUpTokenDB(reserveData['variableDebtTokenAddress']);
                    const vDebtTokenBalance = new BigNumber(await vDebtTokenHelper.callReadMethod('balanceOf', fodlAccount));
                    if(vDebtTokenBalance.gt(0)) {
                        logger.info(`my borrowed balance: ${vDebtToken.readableAmountFromBN(vDebtTokenBalance).toFixed(6)} ${vDebtToken.symbol}`);
                    }
                }
            }

        }
    }
};
// const searchAllMarkets = async (userAddress: string) => {
//     const lines = new nReadlines(path.resolve('data/markets.txt'));

//     let market;
//     let lineNumber = 1;

//     while ((market = lines.next())) {
//         logger.info(`checking market - ${market}`);
//         await getMarketReceipt(userAddress, market.toString());
//         lineNumber++;
//     }
// };
// //获取接待
// const getMarketReceipt = async (userAddress: string, marketAddress: string) => {
//     const cToken = new ContractHelper(marketAddress, './Fodl/cToken.json', network);
//     const symbol = await cToken.callReadMethod('symbol');
//     const decimals = await cToken.callReadMethod('decimals');
//     let underlyingToken = null;
//     if (symbol !== 'cETH') {
//         const underlying = await cToken.callReadMethod('underlying');
//         console.log(underlying);
//         underlyingToken = await swissKnife.syncUpTokenDB(underlying);
//         console.log(underlyingToken.symbol);
//     } else {
//         underlyingToken = new ERC20Token('0x0000000000000000', 'ETH', 18);
//     }
//     const mySnapshot = await cToken.callReadMethod('getAccountSnapshot', userAddress);
//     console.log(mySnapshot);
// };
//获取sushiSwap LPT质押挖矿收据
const getSLPFarmingReceipts = async (userAddress: string, poolAddress: string) => {
    const fodlToken = await swissKnife.syncUpTokenDB(Config.FODL);
    const pool = new ContractHelper(poolAddress, './Fodl/slp.staking.json', network);
    const myStakedLPTBalance = await pool.callReadMethod('balanceOf', userAddress);

    const lptAddress = await pool.callReadMethod('stakingToken');
    const lptDetails = await swissKnife.getLPTokenDetails(lptAddress);

    const myRatio = new BigNumber(myStakedLPTBalance).dividedBy(lptDetails.totalSupply);
    const myToken0 = lptDetails.reserve0.multipliedBy(myRatio);
    const myToken0Amount = lptDetails.token0.readableAmountFromBN(myToken0);
    const myToken1 = lptDetails.reserve1.multipliedBy(myRatio);
    const myToken1Amount = lptDetails.token1.readableAmountFromBN(myToken1);

    logger.info(
        `pool[${lptDetails.token0.symbol}-${lptDetails.token1.symbol}] > my balance: ${myToken0Amount.toFixed(6)} ${
            lptDetails.token0.symbol
        } / ${myToken1Amount.toFixed(6)} ${lptDetails.token1.symbol}`,
    );

    const myRewards = await pool.callReadMethod('earned', userAddress);
    const myReadableRewards = fodlToken.readableAmount(myRewards);
    logger.info(
        `pool[${lptDetails.token0.symbol}-${
            lptDetails.token1.symbol
        }] > my pending rewards: ${myReadableRewards.toFixed(4)} ${fodlToken.symbol}`,
    );
};

const main = async () => {
    // await fetchAllReservesToDB();
    // for (const [poolSymbol, poolAddress] of Object.entries(Config.staking)) {
    //     await getSLPFarmingReceipts('0x872c67dd383db7b7e9bc1800546f1ae715a0bc0c', poolAddress);
    // }
    // searchAllMarkets('0xfc87d702139be505715a79c636a80fc092c4d9dc');
    //getPositionReceipts('0x40c839b831c90173dc7fbce49a25274a4688ddd9');
    getPositionReceipts('0xfc87d702139be505715a79c636a80fc092c4d9dc');
    
 //const web3 = Web3Factory.getInstance().getWeb3(network);
 //console.log(web3.utils.toHex('545181540290502656211188641723802732230064173358'))

};

main().catch((e) => {
    logger.error(e.message);
});

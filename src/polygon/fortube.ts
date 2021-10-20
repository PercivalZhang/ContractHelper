import { ContractHelper } from '../library/contract.helper';
import { LoggerFactory } from '../library/LoggerFactory';
import { NetworkType } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';
import BigNumber from 'bignumber.js';

const network = NetworkType.POLYGON;

const swissKnife = new SwissKnife(network);

const logger = LoggerFactory.getInstance().getLogger('main');
/**
 *
 */
const Config = {
    bankController: '0x4ac2735652944fe5c3dd95807287643502e5de51',
};

const SING = '0xCB898b0eFb084Df14dd8E018dA37B4d0f06aB26D';

const isvLPToken = async (address: string) => {
    const helper = new ContractHelper(address, './ForTube/vLPToken.json', network);
    helper.toggleHiddenExceptionOutput();

    if (await helper.callReadMethod('want')) {
        return true;
    } else {
        return false;
    }
};
const getVaultPairedLPTokenReceipt = async (vLPTAddress: string, userAddress: string, isBorrow = false) => {
    logger.info(`vault lp Token: ${vLPTAddress}`);
    const vLPTokenHelper = new ContractHelper(vLPTAddress, './ForTube/vLPToken.json', network);
    vLPTokenHelper.toggleHiddenExceptionOutput();

    const vLPToken = await swissKnife.syncUpTokenDB(vLPTAddress);

    const lptAddress = await vLPTokenHelper.callReadMethod('want');
    const lpToken = await swissKnife.getLPTokenDetails(lptAddress);

    const myShares = new BigNumber(await vLPTokenHelper.callReadMethod('balanceOf', userAddress));
    const category = isBorrow ? 'borrow' : 'deposit';
    logger.info(
        `[${category}] vault lp token balance: ${myShares.div(Math.pow(10, vLPToken.decimals)).toNumber().toFixed(8)} ${
            vLPToken.symbol
        }`,
    );
    const pricePerFullShare = await vLPTokenHelper.callReadMethod('getPricePerFullShare');
    const myPairedLPTBalance = myShares
        .multipliedBy(pricePerFullShare)
        .dividedBy(Math.pow(10, 18))
        .dividedBy(Math.pow(10, 18));
    logger.info(
        `[${category}] paired lp token balance: ${myPairedLPTBalance.toNumber().toFixed(8)} ${lpToken.token0.symbol}-${
            lpToken.token1.symbol
        } LP`,
    );
};

const getReceipts = async (userAddress: string) => {
    const bankControllerHelper = new ContractHelper(Config.bankController, './ForTube/bank.controller.json', network);
    bankControllerHelper.toggleHiddenExceptionOutput();

    const bgHealthFactor = new BigNumber(await bankControllerHelper.callReadMethod('getHealthFactor', userAddress));
    const healthFactor = Number.parseFloat(bgHealthFactor.dividedBy(Math.pow(10, 18)).toNumber().toFixed(2));
    logger.info(`my health factor/index: ${healthFactor}`);

    const liquidationBuffer = (healthFactor - 1) / healthFactor;
    logger.info(`my liquidation buffer: ${(liquidationBuffer * 100).toFixed(2)}%`);

    const myMarketAssets = await bankControllerHelper.callReadMethod('getAssetsIn', userAddress);
    for (const assetAddress of myMarketAssets) {
        await getDepositReceipts(assetAddress, userAddress);
    }
};
const getDepositReceipts = async (fTokenAddress: string, userAddress: string) => {
    console.log(fTokenAddress);
    const fTokenHelper = new ContractHelper(fTokenAddress, './ForTube/fToken.json', network);
    fTokenHelper.toggleHiddenExceptionOutput();

    const fToken = await swissKnife.syncUpTokenDB(fTokenAddress);

    const underlyingTokenAddress = await fTokenHelper.callReadMethod('underlying');
    const underlyingToken = await swissKnife.syncUpTokenDB(underlyingTokenAddress);

    const myInfo = await fTokenHelper.callReadMethod('getAccountState', userAddress);
    const myDepositFTBalance = new BigNumber(myInfo['0']);
    const myBorrowFTBalance = new BigNumber(myInfo['1']);
    const exchangeRatio = myInfo['2'];

    if (myDepositFTBalance.gt(0)) {
        if (await isvLPToken(underlyingToken.address)) {
            await getVaultPairedLPTokenReceipt(underlyingToken.address, userAddress);
        } else {
            const myDepositUnderlyingTokenBalance = myDepositFTBalance
                .multipliedBy(exchangeRatio)
                .dividedBy(Math.pow(10, 18))
                .dividedBy(Math.pow(10, underlyingToken.decimals));
            logger.info(
                `[deposit]: [${myDepositFTBalance.dividedBy(Math.pow(10, fToken.decimals))} ${
                    fToken.symbol
                }] | [${myDepositUnderlyingTokenBalance.toNumber().toFixed(8)} ${underlyingToken.symbol}]`,
            );
        }
    }
    if (myBorrowFTBalance.gt(0)) {
        if (await isvLPToken(underlyingToken.address)) {
            await getVaultPairedLPTokenReceipt(underlyingToken.address, userAddress, true);
        } else {
            const myBorrowUnderlyingTokenBalance = myBorrowFTBalance
                .multipliedBy(exchangeRatio)
                .dividedBy(Math.pow(10, 18))
                .dividedBy(Math.pow(10, underlyingToken.decimals));
            logger.info(
                `[borrow]: [${myBorrowFTBalance.dividedBy(Math.pow(10, fToken.decimals))} ${
                    fToken.symbol
                }] | [${myBorrowUnderlyingTokenBalance.toNumber().toFixed(8)} ${underlyingToken.symbol}]`,
            );
        }
    }
};

const main = async () => {
    // tester address: 0x4d3c30b365dccecceaa3ba367494ff7f7b7a0222   // lp asset
    await getReceipts('0xD2050719eA37325BdB6c18a85F6c442221811FAC');
};

main().catch((e) => {
    logger.error(e.message);
});

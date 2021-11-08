import { ContractHelper } from '../library/contract.helper';
import { LoggerFactory } from '../library/LoggerFactory';
import { NetworkType } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';
import { MasterChefHelper } from '../library/master.chef';
import BigNumber from 'bignumber.js';

const network = NetworkType.FANTOM;

const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('main');
/**
 * Lock wFTM
 * -collateral pool(getCollateralPool()): 0xc25012dadad30c53290e1d77c48308cafa150a81
 *      * balance(userAddress, tokenAddress) 获取用户抵押的token - wFTM的数量
 * -debt pool(getDebtPool()): 0x246d1c179415547f43bd4f8fef847d953c379650
 * mint fAsset tokens, eg:fUSD
 */
const Config = {
    fantomMint: '0xbb634cafef389cdd03bb276c82738726079fcf2e',
    ftmMintTokenRegistry: '0x5ac50e414bb625ce7dc17ad165a604bf3ca8fd23',
    collateral: {
        wFTM: '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83',
        sFTM: '0x69c744d3444202d35a2783929a0f930f2fbb05ad',
    },
    fUSD: '0xad84341756bf337f5a0164515b1f6f993d194e1f',
    fTokens: {
        fUSD: '0xad84341756bf337f5a0164515b1f6f993d194e1f',
        fEUR: '0xe105621721d1293c27be7718e041a4ce0ebb227e',
    },
};

const tokenRegistry = async () => {
    const registry = new ContractHelper(Config.ftmMintTokenRegistry, './fWallet/ftm.mint.token.registry.json', network);
    registry.toggleHiddenExceptionOutput();

    const tokenCount = await registry.callReadMethod('tokensCount');
    for (let i = 0; i < tokenCount; i++) {
        const fTokenAddress = await registry.callReadMethod('tokensList', i);
        const fTokenInfo = await registry.callReadMethod('tokens', fTokenAddress);
        logger.info(`${fTokenInfo.symbol} : isActive[${fTokenInfo.isActive}] canMint[${fTokenInfo.canMint}]`);
    }
};
const getCollateralDebtReceipt = async (userAddress: string) => {
    const fUSD = await swissKnife.syncUpTokenDB(Config.fUSD);

    const ftmMint = new ContractHelper(Config.fantomMint, './fWallet/fantom.mint.json', network);
    ftmMint.toggleHiddenExceptionOutput();

    //抵押池地址
    const collateralPoolAddress = await ftmMint.callReadMethod('getCollateralPool');
    //债务池地址
    const debtPoolAddress = await ftmMint.callReadMethod('getDebtPool');
    //加载抵押池合约
    const collateralPool = new ContractHelper(collateralPoolAddress, './fWallet/ftm.token.storage.json', network);
    collateralPool.toggleHiddenExceptionOutput();
    //加载债务池合约
    const debtPool = new ContractHelper(debtPoolAddress, './fWallet/ftm.token.storage.json', network);
    debtPool.toggleHiddenExceptionOutput();
    //抵押资产总价值（fUSD计价）
    let totalCollateralValue = new BigNumber(0);
    //遍历抵押资产token列表
    for (const [key, cTokenAddress] of Object.entries(Config.collateral)) {
        //获取目标用户在目标抵押资产token上的抵押数量
        const collateralBalance = new BigNumber(
            await collateralPool.callReadMethod('balance', userAddress, cTokenAddress),
        );
        if (collateralBalance.gt(0)) {
            const cToken = await swissKnife.syncUpTokenDB(cTokenAddress);
            logger.info(
                `my collateral balance: ${collateralBalance
                    .dividedBy(Math.pow(10, cToken.decimals))
                    .toNumber()
                    .toFixed(6)} ${cToken.symbol}`,
            );
            //获取抵押token的价格（fUSD计价）
            const priceCToken = await ftmMint.callReadMethod('getPrice', cTokenAddress);
            //计算抵押资产token的价值
            const collateralValue = collateralBalance
                .multipliedBy(priceCToken)
                .dividedBy(Math.pow(10, cToken.decimals));
            //累加
            totalCollateralValue = totalCollateralValue.plus(collateralValue);
        }
    }
    //铸造债务的计算方式同抵押资产类似
    let totalDebtValue = new BigNumber(0);
    for (const [key, fTokenAddress] of Object.entries(Config.fTokens)) {
        const debtBalance = new BigNumber(await debtPool.callReadMethod('balance', userAddress, fTokenAddress));
        if (debtBalance.gt(0)) {
            const fToken = await swissKnife.syncUpTokenDB(fTokenAddress);
            logger.info(
                `my debt balance: ${debtBalance.dividedBy(Math.pow(10, fToken.decimals)).toNumber().toFixed(6)} ${
                    fToken.symbol
                }`,
            );
            const priceFToken = await ftmMint.callReadMethod('getPrice', fTokenAddress);
            const debtValue = debtBalance.multipliedBy(priceFToken).dividedBy(Math.pow(10, fToken.decimals));
            totalDebtValue = totalDebtValue.plus(debtValue);
        }
    }

    if (totalCollateralValue.gt(0) && totalDebtValue.gt(0)) {
        const cRatio = totalCollateralValue.dividedBy(totalDebtValue);
        logger.info(`cRatio[Collateral/Debt]: ${cRatio.toNumber().toFixed(4)}`);
    }
};

const main = async () => {
    await getCollateralDebtReceipt('0x228f23A962D1ACabB1775E31FAF7D1B5bfa85B5E');
    //await tokenRegistry();
};

main().catch((e) => {
    logger.error(e.message);
});

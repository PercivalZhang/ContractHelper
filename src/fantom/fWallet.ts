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
    wFTM: '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83',
    fToken: {
        fUSD: '0xad84341756bf337f5a0164515b1f6f993d194e1f',
    },
};

const main = async () => {
    const wFTM = await swissKnife.syncUpTokenDB(Config.wFTM);
    const fUSD = await swissKnife.syncUpTokenDB(Config.fToken.fUSD);

    const ftmMint = new ContractHelper(Config.fantomMint, './fWallet/fantom.mint.json', network);
    ftmMint.toggleHiddenExceptionOutput();

    const collateralPoolAddress = await ftmMint.callReadMethod('getCollateralPool');
    const debtPoolAddress = await ftmMint.callReadMethod('getDebtPool');

    const collateralPool = new ContractHelper(collateralPoolAddress, './fWallet/ftm.token.storage.json', network);
    collateralPool.toggleHiddenExceptionOutput();
    const debtPool = new ContractHelper(debtPoolAddress, './fWallet/ftm.token.storage.json', network);
    debtPool.toggleHiddenExceptionOutput();

    const collateralBalance = new BigNumber(
        await collateralPool.callReadMethod('balance', '0x228f23A962D1ACabB1775E31FAF7D1B5bfa85B5E', wFTM.address),
    );
    logger.info(
        `my collateral balance: ${collateralBalance.dividedBy(Math.pow(10, wFTM.decimals)).toNumber().toFixed(6)} ${
            wFTM.symbol
        }`,
    );
    const debtFUSDBalance = new BigNumber(
        await debtPool.callReadMethod('balance', '0x228f23A962D1ACabB1775E31FAF7D1B5bfa85B5E', fUSD.address),
    );
    logger.info(
        `my debt balance: ${debtFUSDBalance.dividedBy(Math.pow(10, fUSD.decimals)).toNumber().toFixed(6)} ${
            fUSD.symbol
        }`,
    );

    const priceWFTM = await ftmMint.callReadMethod('getPrice', wFTM.address);
    const priceFUSD = await ftmMint.callReadMethod('getPrice', fUSD.address);

    const collateralValue = collateralBalance.multipliedBy(priceWFTM).dividedBy(Math.pow(10, wFTM.decimals));
    const debtFUSDValue = debtFUSDBalance.multipliedBy(priceFUSD).dividedBy(Math.pow(10, fUSD.decimals));

    const cRatio = collateralValue.dividedBy(debtFUSDValue);
    console.log(`${cRatio.toNumber().toFixed(4)}`);
};

main().catch((e) => {
    logger.error(e.message);
});

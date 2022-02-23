import { ContractHelper } from '../../library/contract.helper';
import { LoggerFactory } from '../../library/LoggerFactory';
import { NetworkType } from '../../library/web3.factory';
import { SwissKnife } from '../../library/swiss.knife';
import BigNumber from 'bignumber.js';
import { ERC20Token } from '../../library/erc20.token';

type TokenBalance = {
    token: ERC20Token;
    balance: number;
};

const Config = {
    //LP挖矿
    vaults: [
        '0x8fe7a130da6299fe132b664f25d20c6799fca523', //Super Benqi ETH, 版本SV
    ],
    H2O: '0x026187bdbc6b751003517bcb30ac7817d5b766f8',
};

const network = NetworkType.AVALANCHE;

const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('vault');
/**
 *
 * @param sTokenAmount
 * @param sTokenAddress
 * @returns
 */
const getCTokenAmount = async (sTokenAmount: BigNumber, sTokenAddress: string): Promise<TokenBalance> => {
    const sTokenHelper = new ContractHelper(sTokenAddress, './Avalanche/Defrost/super.token.json', network);
    const cTokenAddress = await sTokenHelper.callReadMethod('stakeToken');
    const cTokenHelper = new ContractHelper(cTokenAddress, './erc20.json', network);
    const cToken = await swissKnife.syncUpTokenDB(cTokenAddress);
    const totalStakedCTokens = await cTokenHelper.callReadMethod('balanceOf', sTokenAddress);
    const totalSuperTokens = await sTokenHelper.callReadMethod('totalSupply');
    const cTokenAmount = sTokenAmount.multipliedBy(totalStakedCTokens).dividedBy(totalSuperTokens);
    return {
        token: cToken,
        balance: cToken.readableAmountFromBN(cTokenAmount),
    };
};
const getUserVaultReceipt = async (vaultAddress: string, userAddress: string) => {
    // const ptpToken = await swissKnife.syncUpTokenDB(Config.ptp);
    const vault = new ContractHelper(vaultAddress, './Avalanche/Defrost/collateral.vault.json', network);
    const sTokenAddress = await vault.callReadMethod('collateralToken');
    const sToken = await swissKnife.syncUpTokenDB(sTokenAddress);
    const minCollateralRate = await vault.callReadMethod('collateralRate');
    //通过oracle获取super token price
    const oracleAddress = await vault.callReadMethod('getOracleAddress');
    const sTokenPriceOracle = new ContractHelper(oracleAddress, './Avalanche/Defrost/super.token.oracle.json', network);
    const sTokenPriceData = await sTokenPriceOracle.callReadMethod('getSuperPrice', sTokenAddress);
    const sTokenPrice = sTokenPriceData['1'];

    const vaultTAG = `vault - ${sToken.symbol}`;
    logger.info(
        `${vaultTAG} > minimum collateral rate: ${new BigNumber(minCollateralRate)
            .dividedBy(1e18) //decimal 1e18
            .multipliedBy(100)
            .toNumber()
            .toFixed(4)}%`,
    );
    //获取用户抵押资产余额
    const sTokenBalance = await vault.callReadMethod('collateralBalances', userAddress);
    if (new BigNumber(sTokenBalance).gt(0)) {
        logger.info(
            `${vaultTAG} > collateral super token balance: ${sToken.readableAmount(sTokenBalance).toFixed(6)} ${
                sToken.symbol
            }`,
        );
        //获取用户质押资产的价值USD
        const sTokenUSD = new BigNumber(sTokenPrice)
            .multipliedBy(sTokenBalance)
            .dividedBy(Math.pow(10, 28))
            .dividedBy(Math.pow(10, sToken.decimals));
        logger.info(`${vaultTAG} > collateral super token value: ${sTokenUSD.toNumber().toFixed(6)} USD`);
        //获取super Token对应的cToken的数量
        const underlyingTokenBalance = await getCTokenAmount(new BigNumber(sTokenBalance), sTokenAddress);
        logger.info(
            `${vaultTAG} > collateral underlying token balance: ${underlyingTokenBalance.balance.toFixed(6)} ${
                underlyingTokenBalance.token.symbol
            }`,
        );
    }
};

const main = async () => {
    // const underlyingTokenAddresses = await poolManager.callReadMethod('getTokenAddresses');
    for (const vaultAddress of Config.vaults) {
        await getUserVaultReceipt(vaultAddress, '0x5ea5a55be3c8c199244141f904857b0a389c218f');
    }
};

main().catch((e) => {
    logger.error(e.message);
});

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
        '0x8fe7a130da6299fe132b664f25d20c6799fca523', //Super Benqi ETH
        '0x5a733eb741bc080abae9bf3adaed9400416932f0', //Super Benqi DAI
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
const getUnderlyingTokenAmount = async (sTokenAmount: BigNumber, sTokenAddress: string): Promise<TokenBalance> => {
    const sTokenHelper = new ContractHelper(sTokenAddress, './Avalanche/Defrost/super.token.json', network);
    const underlyingTokenAddress = await sTokenHelper.callReadMethod('stakeToken');
    const underlyingTokenHelper = new ContractHelper(underlyingTokenAddress, './erc20.json', network);
    const unnderlyingToken = await swissKnife.syncUpTokenDB(underlyingTokenAddress);
    const totalStakedUnderlyingTokens = await underlyingTokenHelper.callReadMethod('balanceOf', sTokenAddress);
    const totalSuperTokens = await sTokenHelper.callReadMethod('totalSupply');
    const underlyingTokenAmount = sTokenAmount.multipliedBy(totalStakedUnderlyingTokens).dividedBy(totalSuperTokens);
    return {
        token: unnderlyingToken,
        balance: unnderlyingToken.readableAmountFromBN(underlyingTokenAmount),
    };
};
const getUserVaultReceipt = async (vaultAddress: string, userAddress: string) => {
    // const ptpToken = await swissKnife.syncUpTokenDB(Config.ptp);
    const vault = new ContractHelper(vaultAddress, './Avalanche/Defrost/collateral.vault.json', network);
    const sTokenAddress = await vault.callReadMethod('collateralToken');
    const sToken = await swissKnife.syncUpTokenDB(sTokenAddress);
    const minCollateralRate = await vault.callReadMethod('collateralRate');

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
    logger.info(
        `${vaultTAG} > collateral super token balance: ${sToken.readableAmount(sTokenBalance).toFixed(6)} ${
            sToken.symbol
        }`,
    );
    const underlyingTokenBalance = await getUnderlyingTokenAmount(new BigNumber(sTokenBalance), sTokenAddress);
    logger.info(
        `${vaultTAG} > collateral underlying token balance: ${underlyingTokenBalance.balance.toFixed(6)} ${
            underlyingTokenBalance.token.symbol
        }`,
    );
};

const main = async () => {
    // const underlyingTokenAddresses = await poolManager.callReadMethod('getTokenAddresses');
    for (const vaultAddress of Config.vaults) {
        await getUserVaultReceipt(vaultAddress, '0x881897b1FC551240bA6e2CAbC7E59034Af58428a');
    }
};

main().catch((e) => {
    logger.error(e.message);
});

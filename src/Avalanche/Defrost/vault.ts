import { LoggerFactory } from '../../library/LoggerFactory';
import BigNumber from 'bignumber.js';
import { ContractHelper } from '../../library/contract.helper';
import { SwissKnife } from '../../library/swiss.knife';
import { NetworkType } from '../../library/web3.factory';
import { Config } from './Config';
import { ERC20Token } from '../../library/erc20.token';

type TokenBalance = {
    token: ERC20Token;
    balance: number;
};
const logger = LoggerFactory.getInstance().getLogger('vault');

export class SuperVault {
    public readonly address: string;
    public network: NetworkType;
    private vault: ContractHelper;
    private hideExceptionOutput: boolean;

    constructor(address: string, network: NetworkType) {
        this.vault = new ContractHelper(address, './Avalanche/Defrost/collateral.vault.json', network);
        this.address = address;
        this.network = network;
        this.hideExceptionOutput = false;
    }

    public toggleHiddenExceptionOutput() {
        this.hideExceptionOutput = !this.hideExceptionOutput;
    }
    /**
     *
     * @param sTokenAmount
     * @param sTokenAddress
     * @returns
     */
    public static getCTokenAmount = async (
        sTokenAmount: BigNumber,
        sTokenAddress: string,
        network: NetworkType,
    ): Promise<TokenBalance> => {
        const swissKnife = new SwissKnife(network);
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
    public async getVaultInfo() {
        const swissKnife = new SwissKnife(this.network);
        const sTokenAddress = await this.vault.callReadMethod('collateralToken');
        const sToken = await swissKnife.syncUpTokenDB(sTokenAddress);
        const sTokenHelper = new ContractHelper(sTokenAddress, './Avalanche/Defrost/super.token.json', this.network);
        const vaultTAG = `${sToken.symbol}`;
        logger.info(`${vaultTAG} > collateral token - ${sToken.symbol}: ${sTokenAddress}`);
        //获取vault抵押的super token数量
        const totalCollateralTokens = sToken.readableAmount(
            await sTokenHelper.callReadMethod('balanceOf', this.vault.address),
        );
        logger.info(
            `${vaultTAG} > collateral token total balance: ${totalCollateralTokens.toFixed(4)} ${sToken.symbol}`,
        );
        //获取vault的最小抵押率
        const minCollateralRate = await this.vault.callReadMethod('collateralRate');
        logger.info(
            `${vaultTAG} > minimum collateral rate: ${new BigNumber(minCollateralRate)
                .dividedBy(1e18) //decimal 1e18
                .multipliedBy(100)
                .toNumber()
                .toFixed(4)}%`,
        );
        //通过oracle获取super token price
        const oracleAddress = await this.vault.callReadMethod('getOracleAddress');
        const sTokenPriceOracle = new ContractHelper(
            oracleAddress,
            './Avalanche/Defrost/super.token.oracle.json',
            this.network,
        );
        //通过预言机获取抵押token(SuperToken)的价格
        const sTokenPriceData = await sTokenPriceOracle.callReadMethod('getSuperPrice', sTokenAddress);
        const sTokenPrice = new BigNumber(sTokenPriceData['1']).dividedBy(1e18).dividedBy(1e10);
        logger.info(
            `${vaultTAG} > collateral token - ${sToken.symbol} price: ${sTokenPrice.toNumber().toFixed(4)} USD`,
        );
        //计算vault TVL
        const tvlUSD = sTokenPrice.multipliedBy(totalCollateralTokens);
        logger.info(`${vaultTAG} > TVL: ${tvlUSD.toNumber().toFixed(4)} USD`);
        //最大可铸造H2O Token的价值
        const maxMinableH2O = tvlUSD.multipliedBy(1e18).dividedBy(minCollateralRate);
        logger.info(`max minable H2O: ${maxMinableH2O.toNumber().toFixed(2)} USD`);
        //获取清算惩罚和奖励因子
        const liquidationPenalty = new BigNumber(await this.vault.callReadMethod('liquidationPenalty')).dividedBy(1e18);
        const liquidationReward = new BigNumber(await this.vault.callReadMethod('liquidationReward')).dividedBy(1e18);
        logger.info(
            `${vaultTAG} > liquidation penalty ratio: ${liquidationPenalty.multipliedBy(100).toNumber().toFixed(2)}%`,
        );
        logger.info(
            `${vaultTAG} > liquidation reward ratio: ${liquidationReward.multipliedBy(100).toNumber().toFixed(2)}%`,
        );
        logger.info(
            `${vaultTAG} > total collateral token loss when being liquidation: ${liquidationPenalty
                .plus(liquidationReward)
                .multipliedBy(100)
                .toNumber()
                .toFixed(2)}%`,
        );
    }

    public getUserReceipt = async (userAddress: string) => {
        const swissKnife = new SwissKnife(this.network);
        const assetToken = await swissKnife.syncUpTokenDB(Config.H2O);
        //const vault = new ContractHelper(vaultAddress, './Avalanche/Defrost/collateral.vault.json', network);
        const sTokenAddress = await this.vault.callReadMethod('collateralToken');
        const sToken = await swissKnife.syncUpTokenDB(sTokenAddress);
        const minCollateralRate = await this.vault.callReadMethod('collateralRate');
        //通过racle获取super token price
        const oracleAddress = await this.vault.callReadMethod('getOracleAddress');
        const sTokenPriceOracle = new ContractHelper(
            oracleAddress,
            './Avalanche/Defrost/super.token.oracle.json',
            this.network,
        );
        const sTokenPriceData = await sTokenPriceOracle.callReadMethod('getSuperPrice', sTokenAddress);
        const sTokenPrice = sTokenPriceData['1'];

        const vaultTAG = `${sToken.symbol}`;
        //获取用户抵押资产余额
        const sTokenBalance = await this.vault.callReadMethod('collateralBalances', userAddress);
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
            const underlyingTokenBalance = await SuperVault.getCTokenAmount(
                new BigNumber(sTokenBalance),
                sTokenAddress,
                this.network,
            );
            logger.info(
                `${vaultTAG} > collateral underlying token balance: ${underlyingTokenBalance.balance.toFixed(6)} ${
                    underlyingTokenBalance.token.symbol
                }`,
            );
            //获取asset Token的余额: H2O稳定币
            const assetTokenBalance = await this.vault.callReadMethod('getAssetBalance', userAddress);
            logger.info(
                `${vaultTAG} > asset token balance: ${assetToken.readableAmount(assetTokenBalance).toFixed(6)} ${
                    assetToken.symbol
                }`,
            );
            const myCollateralRate = sTokenUSD.dividedBy(assetToken.readableAmount(assetTokenBalance));
            logger.info(
                `${vaultTAG} > my collateral rate: ${myCollateralRate.multipliedBy(100).toNumber().toFixed(2)}%`,
            );
        }
    };
}

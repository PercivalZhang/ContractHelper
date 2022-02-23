import { LoggerFactory } from '../../library/LoggerFactory';
import BigNumber from 'bignumber.js';
import { ContractHelper } from '../../library/contract.helper';
import { SwissKnife } from '../../library/swiss.knife';
import { NetworkType } from '../../library/web3.factory';

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
}

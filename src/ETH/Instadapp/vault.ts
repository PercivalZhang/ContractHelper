import { LoggerFactory } from '../../library/LoggerFactory';
import BigNumber from 'bignumber.js';
import { ContractHelper } from '../../library/contract.helper';
import { SwissKnife } from '../../library/swiss.knife';
import { Config } from './config';
import { CoinMarketcap } from '../../library/coinmarketcap';

const logger = LoggerFactory.getInstance().getLogger('Vault');
const gSwissKnife = new SwissKnife(Config.network);
const gCMP = CoinMarketcap.getInstance()

type VaultConfig = {
    address: string;
    price: number;
};

export class Vault {
    public readonly address: string;
    public readonly assetPrice: number;
    protected itself: ContractHelper;
    private hideExceptionOutput: boolean;

    constructor(vaultConfig: VaultConfig) {
        this.itself = new ContractHelper(vaultConfig.address, './ETH/Instadapp/vault.json', Config.network);
        this.address = vaultConfig.address;
        this.assetPrice = vaultConfig.price
        this.hideExceptionOutput = false;
    }

    public toggleHiddenExceptionOutput() {
        this.hideExceptionOutput = !this.hideExceptionOutput;
    }

    public async getUserReceipt(userAddress: string) {
        //Asset Token - eg. USDC
        const assetTokenAddress = await this.itself.callReadMethod('token')
        const assetToken = await gSwissKnife.syncUpTokenDB(assetTokenAddress)

        //AAVE凭证token - eg. aUSDC
        const aTokenAddress = await this.itself.callReadMethod('atoken')
        //Vault凭证token - eg. iUSDC
        const iToken = await gSwissKnife.syncUpTokenDB(this.address)
        const iTokenBalance = await this.itself.callReadMethod('balanceOf', userAddress)
        logger.info(`getUserReceipt > deposited iToken - ${iToken.symbol} balance: ${iToken.readableAmount(iTokenBalance).toFixed(6)}`)
        const currentExchangePriceData = await this.itself.callReadMethod('getCurrentExchangePrice')
        const currentExchangePrice = currentExchangePriceData[0]
        const assetTokenBalance = new BigNumber(iTokenBalance).multipliedBy(currentExchangePrice).dividedBy(1e18)
        logger.info(`getUserReceipt > deposited asset token - ${assetToken.symbol} balance: ${assetToken.readableAmountFromBN(assetTokenBalance).toFixed(6)}`)
    }

    public async getVaultInfo() {
        const iToken = await gSwissKnife.syncUpTokenDB(this.address)
        //Asset Token - eg. USDC
        const assetAddress = await this.itself.callReadMethod('token')
        const assetToken = await gSwissKnife.syncUpTokenDB(assetAddress)
        const assetPrice = Number.parseFloat(await gCMP.getTokenUSDPrice(assetToken.symbol))
        logger.info(`getVaultInfo > asset price: ${assetPrice}`)
        //AAVE凭证Token - eg. aUSDC
        const aAssetAddress = await this.itself.callReadMethod('atoken')
        const aAssetToken = await gSwissKnife.syncUpTokenDB(aAssetAddress)
        //AAVE存款Token - eg. stETH
        const stETHToken = await gSwissKnife.syncUpTokenDB(Config.vaults.tokens.stETH)
        //AAVE借款Token - eg. weth
        const wethToken = await gSwissKnife.syncUpTokenDB(Config.vaults.tokens.weth)

        const exchangePrice = await this.itself.callReadMethod('getCurrentExchangePrice')
        logger.info(`getVaultInfo > current exchange price: ${new BigNumber(exchangePrice[0]).dividedBy(1e18).toNumber().toFixed(4)}`)

        //金库总资金量（以asset token计量）
        const totalSupply = await this.itself.callReadMethod('totalSupply')
        const tvlInAsset = new BigNumber(totalSupply).multipliedBy(exchangePrice[0]).dividedBy(1e18).dividedBy(Math.pow(10, iToken.decimals))
        logger.info(`getVaultInfo > vault TVL in assset - ${assetToken.symbol}: ${tvlInAsset.toFixed(4)}`)

        //获取金库资金详情
        const vaultBalances = await this.itself.callReadMethod('getVaultBalances')

        //AAVE抵押AssetToken产生的凭证token - eg. aUSDC的数量
        const collateralAssetBalance = assetToken.readableAmount(vaultBalances[0])
        logger.info(`getVaultInfo > collateral asset - ${assetToken.symbol} balance: ${collateralAssetBalance.toFixed(4)}`)
        //AAVE存款token - stETH的数量
        const stETHBalance = stETHToken.readableAmount(vaultBalances[1])
        logger.info(`getVaultInfo > stETH balance: ${stETHBalance.toFixed(4)}`)
        //AAVE借款token - weth的数量
        const debtWETHBalance = wethToken.readableAmount(vaultBalances[2])
        logger.info(`getVaultInfo > borrowed WETH balance: ${debtWETHBalance.toFixed(4)}`)

        const assetTokenAmountInVault = assetToken.readableAmount(vaultBalances[3])
        logger.info(`getVaultInfo > vault available asset token - ${assetToken.symbol} balance: ${assetTokenAmountInVault.toFixed(4)}`)

        const assetTokenAmountInDSA = assetToken.readableAmount(vaultBalances[4])
        logger.info(`getVaultInfo > DSA account asset token - ${assetToken.symbol} balance: ${assetTokenAmountInDSA.toFixed(4)}`)

        const withdrawableAssetTokenAmount = assetTokenAmountInVault + assetTokenAmountInDSA
        logger.info(`getVaultInfo > withrawable asset token - ${assetToken.symbol} balance: ${withdrawableAssetTokenAmount.toFixed(4)}`)

        const netAssetTokenAmount = assetToken.readableAmount(vaultBalances[5])
        logger.info(`getVaultInfo > total net asset token - ${assetToken.symbol} balance: ${netAssetTokenAmount.toFixed(4)}`)

        // const withdrawableAssetTokenAmount = netAssetTokenAmount - collateralAssetBalance
        // logger.info(`getVaultInfo > withrawable asset token - ${assetToken.symbol} balance: ${withdrawableAssetTokenAmount.toFixed(4)}`)

        const ethPrice = Number.parseFloat(await gCMP.getTokenUSDPrice('weth'))
        logger.info(`getVaultInfo > eth price: ${ethPrice}`)

        //净锁仓价值（去掉债务）
        const netTVL = netAssetTokenAmount * assetPrice  + stETHBalance * Config.price.eth - debtWETHBalance * ethPrice
        logger.info(`getVaultInfo > net TVL: ${netTVL.toFixed(4)} USD`)
        //总锁仓量（没有去掉债务） 
        const tvl = netAssetTokenAmount * assetPrice + stETHBalance * Config.price.eth
        logger.info(`getVaultInfo > TVL: ${tvl.toFixed(4)} USD`)
        //杠杆率
        const leverageRatio = tvl / netTVL
        logger.info(`getVaultInfo > leverage ratio : ${leverageRatio.toFixed(4)}`)

        const loanToValue = debtWETHBalance * Config.price.eth / tvl
        logger.info(`getVaultInfo > loan to value(LTV) : ${loanToValue.toFixed(4)}`)

        const ratio = await this.itself.callReadMethod('ratios')
        logger.info(`getVaultInfo > max limit: ${ratio[0] / 1e4}`)
        logger.info(`getVaultInfo > max limit gap: ${ratio[1] / 1e4}`)
        logger.info(`getVaultInfo > min limit: ${ratio[2] / 1e4}`)
        logger.info(`getVaultInfo > min limit gap: ${ratio[3] / 1e4}`)
        logger.info(`getVaultInfo > stETH limit: ${ratio[4] / 1e4}`)
        logger.info(`getVaultInfo > max borrow rate: ${ratio[5] / 1e25}`)
    }
}
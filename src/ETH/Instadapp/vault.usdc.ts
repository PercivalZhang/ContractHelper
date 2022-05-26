import { Vault } from './vault'
import { Config } from './config'
import { LoggerFactory } from '../../library/LoggerFactory'
import { SwissKnife } from '../../library/swiss.knife'

const logger = LoggerFactory.getInstance().getLogger('Vault');
const gSwissKnife = new SwissKnife(Config.network);

export class USDCVault extends Vault {

    constructor() {
        super(Config.vaults.usdc.address)
    }

    public async getVaultInfo() {
         //Asset Token - eg. USDC
         const usdcAddress = await this.itself.callReadMethod('token')
         const usdcToken = await gSwissKnife.syncUpTokenDB(usdcAddress)
         //AAVE凭证Token - eg. aUSDC
         const aUSDCAddress = await this.itself.callReadMethod('atoken')
         const aUSDCToken = await gSwissKnife.syncUpTokenDB(aUSDCAddress)
         //AAVE存款Token - eg. stETH
         const stETHToken = await gSwissKnife.syncUpTokenDB(Config.vaults.usdc.tokens.stETH)
         //AAVE借款Token - eg. weth
         const wethToken = await gSwissKnife.syncUpTokenDB(Config.vaults.usdc.tokens.weth)

        const vaultBalances = await this.itself.callReadMethod('getVaultBalances')

        //AAVE抵押USDC产生的凭证token - aUSDC的数量
        const aUSDCBalance = aUSDCToken.readableAmount(vaultBalances[0])
        logger.info(`getVaultInfo > aUSDC balance: ${aUSDCBalance.toFixed(4)}`)
        //AAVE存款token - stETH的数量
        const stETHBalance = stETHToken.readableAmount(vaultBalances[1])
        logger.info(`getVaultInfo > stETH balance: ${stETHBalance.toFixed(4)}`)
        //AAVE借款token - weth的数量
        const debtWETHBalance = wethToken.readableAmount(vaultBalances[2])
        logger.info(`getVaultInfo > borrowed WTH balance: ${debtWETHBalance.toFixed(4)}`)

        const usdcAmount = usdcToken.readableAmount(vaultBalances[4])
        logger.info(`getVaultInfo > withdrawable USDC balance: ${usdcAmount.toFixed(4)}`)

        const netTVL = usdcAmount + aUSDCBalance + stETHBalance * 1835 - debtWETHBalance * 1835
        logger.info(`getVaultInfo > net TVL: ${netTVL.toFixed(4)}} USD`)

        const tvl = usdcAmount + aUSDCBalance + stETHBalance * 1835
        logger.info(`getVaultInfo > TVL: ${tvl.toFixed(4)}} USD`)

        const leverageRatio = tvl / netTVL
        logger.info(`getVaultInfo > leverage ratio : ${leverageRatio.toFixed(4)}`)

        const loanToValue = debtWETHBalance * 1835 / tvl
        logger.info(`getVaultInfo > load to value(LTV) : ${loanToValue.toFixed(4)}`)
    }

}

const main = async () => {
    const userAddress = '0x881897b1FC551240bA6e2CAbC7E59034Af58428a'
    const usdcVault = new USDCVault()
    await usdcVault.getVaultInfo()
};

main().catch((e) => {
    logger.error(e.message);
});
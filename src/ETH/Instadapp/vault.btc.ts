import { Vault } from './vault'
import { Config } from './config'
import { LoggerFactory } from '../../library/LoggerFactory'
import { SwissKnife } from '../../library/swiss.knife'

const logger = LoggerFactory.getInstance().getLogger('vault.usdc');
const gSwissKnife = new SwissKnife(Config.network);
/**
 * Strategy
 * deposit WBTC into AAVE as collateral to get aWBTC
 * borrow WETH from AAVE
 * Stake WETH into Lido to get stETH
 * deposit stETH into AAVE to get aStETH
 */
export class BTCVault extends Vault {

    constructor() {
        super(Config.vaults.btc.address)
    }

    public async getVaultInfo() {
         //Asset Token - WBTC
         const wBTCAddress = await this.itself.callReadMethod('token')
         const wBTCToken = await gSwissKnife.syncUpTokenDB(wBTCAddress)

         //AAVE凭证Token - aWBTC
         const aWBTCAddress = await this.itself.callReadMethod('atoken')
         const aWBTCToken = await gSwissKnife.syncUpTokenDB(aWBTCAddress)

         //AAVE存款Token - stETH
         const stETHToken = await gSwissKnife.syncUpTokenDB(Config.vaults.usdc.tokens.stETH)
         //AAVE借款Token - eg. weth
         const wethToken = await gSwissKnife.syncUpTokenDB(Config.vaults.usdc.tokens.weth)

        const vaultBalances = await this.itself.callReadMethod('getVaultBalances')

        //AAVE存入并抵押WBTC产生的凭证token - aWBTC的数量
        const aWBTCBalance = aWBTCToken.readableAmount(vaultBalances[0])
        logger.info(`getVaultInfo > aWBTC balance: ${aWBTCBalance.toFixed(4)}`)
        //AAVE存款token - stETH的数量
        const stETHBalance = stETHToken.readableAmount(vaultBalances[1])
        logger.info(`getVaultInfo > stETH balance: ${stETHBalance.toFixed(4)}`)
        //AAVE借款token - weth的数量
        const debtWETHBalance = wethToken.readableAmount(vaultBalances[2])
        logger.info(`getVaultInfo > borrowed WETH balance: ${debtWETHBalance.toFixed(4)}`)

        const withdrawableWBTCAmount = wBTCToken.readableAmount(vaultBalances[4])
        logger.info(`getVaultInfo > withdrawable WBTC balance: ${withdrawableWBTCAmount.toFixed(4)}`)

        const netTVL = withdrawableWBTCAmount * Config.price.btc + aWBTCBalance * Config.price.btc + stETHBalance * Config.price.eth - debtWETHBalance * Config.price.eth
        logger.info(`getVaultInfo > net TVL: ${netTVL.toFixed(4)}} USD`)

        const tvl = withdrawableWBTCAmount * Config.price.btc + aWBTCBalance * Config.price.btc + stETHBalance * Config.price.eth
        logger.info(`getVaultInfo > TVL: ${tvl.toFixed(4)}} USD`)

        const leverageRatio = tvl / netTVL
        logger.info(`getVaultInfo > leverage ratio : ${leverageRatio.toFixed(4)}`)

        const loanToValue = debtWETHBalance * Config.price.eth / tvl
        logger.info(`getVaultInfo > load to value(LTV) : ${loanToValue.toFixed(4)}`)
    }

}

const main = async () => {
    const userAddress = '0x7bdff8af765637783a3e012012f147a6930dd7e8'
    const vault = new BTCVault()
    await vault.getVaultInfo()

    await vault.getUserReceipt(userAddress)
};

main().catch((e) => {
    logger.error(e.message);
});
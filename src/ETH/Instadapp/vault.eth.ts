import { Vault } from './vault'
import { Config } from './config'
import { LoggerFactory } from '../../library/LoggerFactory'
import { SwissKnife } from '../../library/swiss.knife'
import { ContractHelper } from '../../library/contract.helper';
import BigNumber from 'bignumber.js';

const logger = LoggerFactory.getInstance().getLogger('vault.eth');
const gSwissKnife = new SwissKnife(Config.network);

export class ETHVault extends Vault {

    constructor() {
        super(Config.vaults.eth.address)
        this.itself = new ContractHelper(Config.vaults.eth.address, './ETH/Instadapp/vault.eth.json', Config.network);
    }

    public async getVaultInfo() {
         //AAVE存款Token - eg. stETH
         const stETHToken = await gSwissKnife.syncUpTokenDB(Config.vaults.usdc.tokens.stETH)
         //AAVE借款Token - eg. weth
         const wethToken = await gSwissKnife.syncUpTokenDB(Config.vaults.usdc.tokens.weth)

        const netAssets = await this.itself.callReadMethod('netAssets')

        //AAVE抵押stETH产生的凭证token - aStETH的数量
        const stETHBalance = stETHToken.readableAmount(netAssets[0])
        logger.info(`getVaultInfo > collateral stETH balance: ${stETHBalance.toFixed(4)}`)
      
        //AAVE借款token - weth的数量
        const debtWETHBalance = wethToken.readableAmount(netAssets[1])
        logger.info(`getVaultInfo > borrowed WETH balance: ${debtWETHBalance.toFixed(4)}`)

        const withdrawableAmount = stETHBalance - debtWETHBalance
        logger.info(`getVaultInfo > withdrawable stETH balance: ${withdrawableAmount.toFixed(4)}`)

        const tvl = stETHBalance * Config.price.eth
        logger.info(`getVaultInfo > TVL: ${tvl.toFixed(4)}} USD`)

        const netTVL =  withdrawableAmount * Config.price.eth
        logger.info(`getVaultInfo > net TVL: ${netTVL.toFixed(4)} USD`)


        const leverageRatio = tvl / netTVL
        logger.info(`getVaultInfo > leverage ratio : ${leverageRatio.toFixed(4)}`)

        const loanToValue = debtWETHBalance * Config.price.eth / tvl
        logger.info(`getVaultInfo > load to value(LTV) : ${loanToValue.toFixed(4)}`)
    }

    public async getUserReceipt(userAddress: string) {
        //Vault凭证token - eg. iUSDC
        const iToken = await gSwissKnife.syncUpTokenDB(this.address)
        const iTokenBalance = await this.itself.callReadMethod('balanceOf', userAddress)
        logger.info(`getUserReceipt > deposited iToken - ${iToken.symbol} balance: ${iToken.readableAmount(iTokenBalance).toFixed(6)}`)
        const currentExchangePriceData = await this.itself.callReadMethod('getCurrentExchangePrice')
        const currentExchangePrice = currentExchangePriceData[0]
        const assetTokenBalance = new BigNumber(iTokenBalance).multipliedBy(currentExchangePrice).dividedBy(1e18)
        logger.info(`getUserReceipt > deposited asset token - ETH balance: ${assetTokenBalance.dividedBy(1e18).toNumber().toFixed(6)}`)
    }

}

const main = async () => {
    const userAddress = '0x7bdff8af765637783a3e012012f147a6930dd7e8'
    const vault = new ETHVault()
    await vault.getVaultInfo()
    await vault.getUserReceipt(userAddress)
};

main().catch((e) => {
    logger.error(e.message);
});
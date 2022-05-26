import { LoggerFactory } from '../../library/LoggerFactory';
import BigNumber from 'bignumber.js';
import { ContractHelper } from '../../library/contract.helper';
import { SwissKnife } from '../../library/swiss.knife';
import { Config } from './config';

const logger = LoggerFactory.getInstance().getLogger('Vault');
const gSwissKnife = new SwissKnife(Config.network);

export abstract class Vault {
    public readonly address: string;
    protected itself: ContractHelper;
    private hideExceptionOutput: boolean;

    constructor(vaultAddress: string) {
        this.itself = new ContractHelper(vaultAddress, './ETH/Instadapp/vault.json', Config.network);
        this.address = vaultAddress;
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

    public abstract getVaultInfo()
}
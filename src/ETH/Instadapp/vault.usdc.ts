import { Vault } from './vault'
import { Config } from './config'
import { LoggerFactory } from '../../library/LoggerFactory'

const logger = LoggerFactory.getInstance().getLogger('vault.usdc');

const main = async () => {
    const userAddress = '0x881897b1FC551240bA6e2CAbC7E59034Af58428a'
    const vault = new Vault(Config.vaults.usdc)
    await vault.getVaultInfo()
    //await vault.getUserReceipt(userAddress)
};

main().catch((e) => {
    logger.error(e.message);
});
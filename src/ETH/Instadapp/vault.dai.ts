import { Vault } from './vault'
import { Config } from './config'
import { LoggerFactory } from '../../library/LoggerFactory'

const logger = LoggerFactory.getInstance().getLogger('vault.dai');

const main = async () => {
    const userAddress = '0x7d9a8c475b55e70f2d9837c853ee145ccca9d249'
    const vault = new Vault(Config.vaults.dai)
    await vault.getVaultInfo()
    await vault.getUserReceipt(userAddress)
};

main().catch((e) => {
    logger.error(e.message);
});
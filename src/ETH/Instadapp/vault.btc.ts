import { Vault } from './vault'
import { Config } from './config'
import { LoggerFactory } from '../../library/LoggerFactory'

const logger = LoggerFactory.getInstance().getLogger('vault.usdc');

/**
 * Strategy
 * - deposit WBTC into AAVE as collateral to get aWBTC
 * - borrow WETH from AAVE
 * - stake WETH into Lido to get stETH
 * - deposit stETH into AAVE to get aStETH
 */
const main = async () => {
    const userAddress = '0x7bdff8af765637783a3e012012f147a6930dd7e8'
    const vault = new Vault(Config.vaults.btc)
    await vault.getVaultInfo()
    await vault.getUserReceipt(userAddress)
};

main().catch((e) => {
    logger.error(e.message);
});
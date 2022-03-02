import { nodeInteraction } from '@waves/waves-transactions';
import { ERC20Token } from '../../library/erc20.token';
import { LoggerFactory } from '../../library/LoggerFactory';
import { TokenDB } from '../db.token';
import BigNumber from 'bignumber.js';
import { Vault } from './vault';

const NodeUrl = 'https://nodes.wavesnodes.com/';
const userAddress = '3P5V82NzawM19QPrs8JoFFSctzxzjduUQUZ';

//const vault = new Vault('3PEiD1zJWTMZNWSCyzhvBw9pxxAWeEwaghR');   //USDT
//const usdtVault = new Vault('3P8G747fnB1DTQ4d5uD114vjAaeezCW4FaM'); //WAVES
//const usdtVault = new Vault('3PGCkrHBxFMi7tz1xqnxgBpeNvn5E4M4g8S'); //USDC
//const vault = new Vault('3PCwFXSq8vj8iKitA5zrrLRbuqehfmimpce');     //USDN
const vault = new Vault('3PBjqiMwwag72VWUtHNnVrxTBrNK8D7bVcN');     //EUR
const main = async () => {
    
    await vault.loadBasicInfo();
    await vault.getConfigInfo();
    await vault.getVaultInfo();
    //await usdtVault.getUserInfo(userAddress);
}
main().catch((e) => {
    console.error(e.message);
});

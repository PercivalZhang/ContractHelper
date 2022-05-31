import { LoggerFactory } from '../../library/LoggerFactory';
import { Vault } from './vault';
import { Config } from './Config';

const userAddress = '3P5V82NzawM19QPrs8JoFFSctzxzjduUQUZ';
//const userAddress = '3PPEM6EqVwkHhCZwUMonxj5dgEkzLW9g1Lu';

const vault = new Vault(Config.vaults.usdt); //USDT
//const vault = new Vault('3P8G747fnB1DTQ4d5uD114vjAaeezCW4FaM'); //WAVES
//const vault = new Vault('3PGCkrHBxFMi7tz1xqnxgBpeNvn5E4M4g8S'); //USDC
//const vault = new Vault('3PCwFXSq8vj8iKitA5zrrLRbuqehfmimpce');     //USDN
//const vault = new Vault('3PBjqiMwwag72VWUtHNnVrxTBrNK8D7bVcN'); //EUR
const main = async () => {
    await vault.loadBasicInfo();
    await vault.getConfigInfo();
    await vault.getUserInfo(userAddress);
};
main().catch((e) => {
    console.error(e.message);
});

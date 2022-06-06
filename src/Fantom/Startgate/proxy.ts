import { LoggerFactory } from '../../library/LoggerFactory';
import { Config } from './config';
import { Web3Factory } from '../../library/web3.factory';

const logger = LoggerFactory.getInstance().getLogger('proxy');


const main = async () => {
//    const proxyAdminAddress = await proxy.callReadMethod('admin')
//     logger.info(`proxy admin: ${proxyAdminAddress}`)
    const web3 = Web3Factory.getInstance().getWeb3(Config.network)
    const contents = await web3.eth.getStorageAt('0x8f0dc8ac1270842ad3c813ef36b0dc14f9ee4ee4', '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103')
    console.log(contents)
};

main().catch((e) => {
    logger.error(e.message);
});
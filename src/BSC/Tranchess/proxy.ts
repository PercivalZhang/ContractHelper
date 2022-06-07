import { LoggerFactory } from '../../library/LoggerFactory';
import { ContractHelper } from '../../library/contract.helper';
import { SwissKnife } from '../../library/swiss.knife';
import { Config } from './Config';
import { Web3Factory } from '../../library/web3.factory';

const logger = LoggerFactory.getInstance().getLogger('proxy');


const proxy = new ContractHelper('0x42867dF3c1ce62613aae3f4238cbcF3d7630880B', './BSC/Tranchess/proxy.json', Config.network);

// 文档： https://docs.openzeppelin.com/contracts/3.x/api/proxy
const main = async () => {
    const web3 = Web3Factory.getInstance().getWeb3(Config.network)
    // param1: proxy address / param2: 固定slot地址
    const proxyAdminAddress = await web3.eth.getStorageAt('0x42867dF3c1ce62613aae3f4238cbcF3d7630880B', '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103')
    // 监控该地址的upgrade交易
    console.log(proxyAdminAddress)
};

main().catch((e) => {
    logger.error(e.message);
});
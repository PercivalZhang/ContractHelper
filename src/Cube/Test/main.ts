import { LoggerFactory } from '../../library/LoggerFactory';
import { ContractHelper } from '../../library/contract.helper';
import { NetworkType } from '../../library/web3.factory';
import { SwissKnife } from '../../library/swiss.knife';


const logger = LoggerFactory.getInstance().getLogger('main');

const network = NetworkType.CUBE;

const swissKnife = new SwissKnife(network);

const web3 = swissKnife.getWeb3()

const token1 = new ContractHelper('0x9603347a4421a35f6f390e3f187bd24c80bdfb27', './erc20.json', network)

const main = async () => {
    const token1ERC20 = await swissKnife.syncUpTokenDB('0x9603347a4421a35f6f390e3f187bd24c80bdfb27')
    const balance = await token1.callReadMethod('balanceOf', '0x0000000000000000000000000000000000000001')
    logger.info(` token - ${token1ERC20.symbol} balance: ${token1ERC20.readableAmount(balance).toFixed(4)}`)

    /**
     * 判断EOA账户创建合约的交易
     * - tx: to地址为空
     * - tx receipt: to地址为空，contractAddress是部署的新合约地址
     * - doc：https://docs.soliditylang.org/en/latest/introduction-to-smart-contracts.html#index-8
     */
    const tx = await web3.eth.getTransaction('0x6c0298c3b10e6fbb5fa8575f7d23bcb5b53905867b9ff7054d7f2b8e2c6524cf')
    console.log(tx)
    const txReceipt = await web3.eth.getTransactionReceipt('0x6c0298c3b10e6fbb5fa8575f7d23bcb5b53905867b9ff7054d7f2b8e2c6524cf')
    console.log(txReceipt)

    /**
     * 合约内部方法再创建合约
     * 需要分析internal tx
     */
};

main().catch((e) => {
    logger.error(e.message);
});
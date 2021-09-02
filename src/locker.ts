import Web3 from 'web3';
import { LoggerFactory } from './library/LoggerFactory';
import axios from 'axios';
import BigNumber from 'bignumber.js';
import sleep from 'sleep';

const logger = LoggerFactory.getInstance().getLogger('locker');

// const uriETH = 'https://mainnet.infura.io/v3/11ae2b7ff4c04391b71dd5a196c21b0d';
const uriETH = 'http://172.18.11.42:8334';

const web3 = new Web3(uriETH);

// const account = web3.eth.accounts.create();

// const pk = '0xbf2f37611253d4cac56537efcfef77b83e2ee3c41dc3ef918276cf9a8e446a28';
const pk = '66e33b635cfdd42a801f5307402be401aa15515bd767cfd62bb477b08dcf4260';

const fromAccount = web3.eth.accounts.privateKeyToAccount(pk);
logger.info(`from address: ${fromAccount.address}`);

const toAddress = '0x4101e21409AC08839BCF3ece7F78bE104DDE4b19';
logger.info(`to address: ${toAddress}`);

const gasOracle =
    'https://api-cn.etherscan.com/api?module=gastracker&action=gasoracle&apikey=T4SX1JYT5D5J62CNBE9YJRT1G57ZEC24VW';

const maxGas = 70000;  // minimum 21000

let lastTxCount;
const lockAccount = async () => {
    while (true) {
        const txCount = await web3.eth.getTransactionCount(fromAccount.address);
        logger.debug(`tx count: ${txCount}`);

        const balance = await web3.eth.getBalance(fromAccount.address);
        logger.info(`balance: ${new BigNumber(balance).dividedBy(Math.pow(10, 18)).toNumber().toFixed(4)}`);

        const lastGasPrice = await web3.eth.getGasPrice();
        logger.debug(`last gas price: ${lastGasPrice}`);

        let gasPrice = lastGasPrice;
        const res = await axios.get(gasOracle);
        if (res.status === 200) {
            let fastGasPrice = res.data['result']['FastGasPrice'];
            fastGasPrice = web3.utils.toWei(fastGasPrice, 'gwei');
            logger.debug(`fast gas price: ${fastGasPrice.toString()}`);
            gasPrice = fastGasPrice;
        }

        const fee = new BigNumber(gasPrice).multipliedBy(maxGas);
        logger.debug(`max fee: ${fee.dividedBy(Math.pow(10, 18)).toNumber().toFixed(4)}`);

        const maxAmount = new BigNumber(balance).minus(fee);
        if (maxAmount.gte(0)) {
            logger.debug(`max amount to send: ${maxAmount.dividedBy(Math.pow(10, 18)).toNumber().toFixed(4)}`);

            const unsignedTX = {
                chainId: await web3.eth.getChainId(),
                nonce: txCount,
                gasLimit: web3.utils.toHex(maxGas),
                gasPrice: web3.utils.toHex(gasPrice),
                from: fromAccount.address,
                to: toAddress,
                value: web3.utils.toHex(maxAmount.toNumber()),
            };

            if (lastTxCount !== txCount) {
                logger.info(`sign and broadcast...`);
                const signedTX = await fromAccount.signTransaction(unsignedTX);

                // 广播交易
                web3.eth.sendSignedTransaction(signedTX.rawTransaction, (err, txHash) => {
                    logger.info('txHash:', txHash);
                    lastTxCount = txCount;
                    if (err) {
                        console.error(err);
                    }
                });
            }
        } else {
            logger.warn(`balance is not enough`);
        }
        sleep.sleep(1);
    }
};

lockAccount().catch((e) => {
    logger.error(e.toString());
});

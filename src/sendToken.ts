import Web3 from 'web3';
import { LoggerFactory } from './library/LoggerFactory';
import axios from 'axios';
import BigNumber from 'bignumber.js';
import sleep from 'sleep';
import * as path from 'path';
import fs from 'fs';

const logger = LoggerFactory.getInstance().getLogger('locker');

// const uriETH = 'https://mainnet.infura.io/v3/11ae2b7ff4c04391b71dd5a196c21b0d';
const uriETH = 'http://172.18.11.42:8334';

const web3 = new Web3(uriETH);

// const account = web3.eth.accounts.create();

//const pk = '0xbf2f37611253d4cac56537efcfef77b83e2ee3c41dc3ef918276cf9a8e446a28';
const pk = '66e33b635cfdd42a801f5307402be401aa15515bd767cfd62bb477b08dcf4260';
const fromAccount = web3.eth.accounts.privateKeyToAccount(pk);
logger.info(`from address: ${fromAccount.address}`);

const toAddress = '0x4101e21409AC08839BCF3ece7F78bE104DDE4b19';
logger.info(`to address: ${toAddress}`);

const gasOracle =
    'https://api-cn.etherscan.com/api?module=gastracker&action=gasoracle&apikey=T4SX1JYT5D5J62CNBE9YJRT1G57ZEC24VW';

const maxGas = 77000;

const USDCAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const CRVAddress = '0xd533a949740bb3306d119cc777fa900ba034cd52';
const USDTAddress = '0xdac17f958d2ee523a2206206994597c13d831ec7';

const TokenAddress = USDTAddress; // target token address

const pathABIFile = path.resolve('abi', 'erc20.json');
const apiInterfaceContract = JSON.parse(fs.readFileSync(pathABIFile).toString());
const contractErc20 = new web3.eth.Contract(apiInterfaceContract, TokenAddress);

let lastTxCount;
const sendToken = async () => {
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
            const tokenBalance = new BigNumber(await contractErc20.methods.balanceOf(fromAccount.address).call());
            logger.debug(`token balance: ${tokenBalance.toNumber()}`);
            logger.debug(`token balance: ${tokenBalance.toNumber().toFixed(4)}`);

            if (tokenBalance.gt(0)) {
                const callData = contractErc20.methods.transfer(toAddress, tokenBalance).encodeABI();
                const unsignedTX = {
                    nonce: txCount,
                    gasLimit: web3.utils.toHex(maxGas),
                    gasPrice: web3.utils.toHex(gasPrice),
                    from: fromAccount.address,
                    to: TokenAddress,
                    data: callData,
                };

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
            } else {
                logger.warn(`token balance is zero`);
            }
        } else {
            logger.warn(`eth balance is not enough`);
        }
        sleep.sleep(1);
    }
};

sendToken().catch((e) => {
    logger.error(e.toString());
});

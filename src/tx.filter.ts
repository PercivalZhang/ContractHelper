import {NetworkType, Web3Factory} from "./library/web3.factory";
import * as lineReader from 'line-reader';
import * as path from "path";
import { sleep } from 'sleep';
import BigNumber from "bignumber.js";

const web3 = Web3Factory.getInstance().getWeb3(NetworkType.HECO);
const result = [];
const main = async () => {
    let i = 0;
    let counter = new BigNumber(0);
    lineReader.eachLine(path.resolve('data/tx.list.txt'), function(line, last) {
        sleep(1);
        if(line.trim().length > 0) {
            if(i % 20 === 0) {
                console.log(`reached line[${i}] - ${line}`);
            }
            web3.eth.getTransaction(line).then(tx => {
                if(tx.input.startsWith('0xedf949e8')) {
                    const amountStr = tx.input.substr(-64);
                    const amount = new BigNumber(eval('0x' + amountStr).toString(10));
                    console.log(`[${i}] detected revoking tx - ${tx.hash}`);
                    console.log(`[${i}] revoked vote: ${amount.dividedBy(1e18).toNumber()} HT`);
                    counter = counter.plus(amount);
                    console.log(`detected revoked ${counter.dividedBy(1e18).toNumber()} HT`);
                }
            });
            i = i + 1;
        }
        // do whatever you want with line...
        if(last){
            // or check if it's the last one
            console.log("+++++++++++++++DONE++++++++++++++++");
            console.log(`total revoked ${counter.dividedBy(1e18).toNumber()} HT`);
        }
    });
};

main().catch(e => {
    console.error(e.message)
})

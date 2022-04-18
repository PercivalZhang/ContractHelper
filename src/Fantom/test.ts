import Web3 from 'web3';
import BigNumber from 'bignumber.js';
import * as path from 'path';
import fs from 'fs';


const web3 = new Web3('https://rpc.fantom.network')

const pathABIFile = path.resolve('abi', './SpookySwap/master.chef.json');
const apiInterfaceContract = JSON.parse(fs.readFileSync(pathABIFile).toString());

const masterChef = new web3.eth.Contract(apiInterfaceContract, '0x2b2929e785374c651a81a63878ab22742656dcdd');
const userAddress = '0x881897b1FC551240bA6e2CAbC7E59034Af58428a';

const main = async () => {
    const poolLength = await masterChef.methods.poolLength().call();
    console.log(`pool length: ` + poolLength);

    const totalAllocPoint = await masterChef.methods.totalAllocPoint().call();
    console.log(`total alloc point: ${totalAllocPoint}`);


    const booRate = await masterChef.methods.booPerSecond().call();
    console.log(`BOO emission rate(S): ${booRate}`);

    const poolInfo = await masterChef.methods.poolInfo(0).call();
    console.log(`pool[0] > lp token: ${poolInfo[0]}`);
    console.log(`pool[0] > alloc point: ${poolInfo[1]}`);

    const pendingBoo = await masterChef.methods.pendingBOO(0, userAddress).call();
    const readablePendingBoo = new BigNumber(pendingBoo).dividedBy(1e18);
    console.log(`pool[0] > pending reward: ${readablePendingBoo.toNumber().toFixed(6)} BOO`);

};

main().catch((e) => {
    console.error(e.message);
});
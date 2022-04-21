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
    //获取矿池的数量
    const poolLength = await masterChef.methods.poolLength().call();
    console.log(`pool length: ` + poolLength);
    //获取奖励总的分配点数
    const totalAllocPoint = await masterChef.methods.totalAllocPoint().call();
    console.log(`total alloc point: ${totalAllocPoint}`);
    //获取奖励token - BOO的释放速率，单位秒
    const booRate = await masterChef.methods.booPerSecond().call();
    console.log(`BOO emission rate(S): ${booRate}`);
    //获取指定池子的详情
    const poolInfo = await masterChef.methods.poolInfo(0).call();
    console.log(poolInfo)
    console.log(`pool[0] > lp token: ${poolInfo[0]}`);
    console.log(`pool[0] > alloc point: ${poolInfo[1]}`);
    //获取指定用户在目标池子里的质押信息
    const userInfo = await masterChef.methods.userInfo(0, userAddress).call();
    console.log(userInfo)
    console.log(`pool[0] > my staked LP token balance: ${userInfo[0]}`);
    console.log(`pool[0] > my claimed BOO: ${userInfo[1]}`);
    //获取指定用户在目标池子里的待领取奖励数目
    const pendingBoo = await masterChef.methods.pendingBOO(0, userAddress).call();
    const readablePendingBoo = new BigNumber(pendingBoo).dividedBy(1e18);
    console.log(`pool[0] > pending reward: ${readablePendingBoo.toNumber().toFixed(6)} BOO`);

};

main().catch((e) => {
    console.error(e.message);
});
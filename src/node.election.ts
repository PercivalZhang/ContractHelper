import { ContractHelper } from './library/contract.helper';
import { LoggerFactory } from './library/LoggerFactory';
import { NetworkType, Web3Factory } from './library/web3.factory';
import BigNumber from 'bignumber.js';

// 0x6636Cc488964AA2E9F2644248601B2909eCC394E'  // greyscale
// '0x7Ce9A4f22FB3B3e2d91cC895bb082d7BD6F08525',
const network = NetworkType.HECO;

const nodeVoting = new ContractHelper(
    '0x6636Cc488964AA2E9F2644248601B2909eCC394E',
    'node.voting.json',
    network
);

const nodeStaking = new ContractHelper(
    '0x5CaeF96c490b5c357847214395Ca384dC3d3b85e',
    'node.staking.json',
    network
);

const logger = LoggerFactory.getInstance().getLogger('main');
const web3 = Web3Factory.getInstance().getWeb3(network);

const pk = '0x98868c28aeb0329e235553ae21060cfc8408b58935e9c9998846bfd0ad10b98d'; // voter
// const pk = '0x27ecb4bd7e0cb6d1dd2d655c3e7331eec9c484d9b0638601b3a42b544526cafd'; // Heco Grayscale Admin
// const pk = '0xb50ff689f6f7fd60c7c8c6284833ac4226fa38e87e12523adec1e8dd3f4a05f6' // accountant
const signer = web3.eth.accounts.privateKeyToAccount(pk);
logger.info(`signer address: ${signer.address}`);

const main = async () => {
    const balance = await web3.eth.getBalance(signer.address);
    logger.info(`signer balance: ${new BigNumber(balance).dividedBy(1e18).toNumber().toFixed(4)} HT`);

    const length = await nodeVoting.callReadMethod('getPoolLength');
    logger.info(length);

    // const userSummary = await nodeVoting.callReadMethod('getUserVotingSummary', signer.address)
    // console.log(userSummary);

    // await nodeVoting.subscribeLogEvent();
    // const ret = await nodeVoting.callWriteMethod(
    //     signer,
    //     'claimReward',
    //     '1',
    //     0,
    //     1
    // );
    // console.log(ret)

    // for (let i = 0; i < length; i++) {
    //     const poolInfo = await nodeVoting.callReadMethod('getPoolWithStatus', i);
    //     logger.info(`pid[${i}] validator: ${poolInfo['0']}`);
    //     logger.info(`pid[${i}] feeShares: ${poolInfo['1']}`);
    //     logger.info(`pid[${i}] pendingFee: ${poolInfo['2']}`);
    //     logger.info(`pid[${i}] status: ${poolInfo['11']}`);
    // }

    // const poolInfo1 = await nodeVoting.callReadMethod('poolInfo', 11);
    // console.log(poolInfo1);


    // const ret = await nodeVoting.callWriteMethod(
    //     signer,
    //     'grantAccountant',
    //     '2',
    //     0,
    //     '0x09acc233e56361f3c32a57cf01cf34f5d56011ff',
    // );
    // console.log(ret);
    // const pendingReward = await nodeVoting.callReadMethod('pendingReward', 43, '0x7BE5C02F3569F57d519621B68c8953fA9f2C071f');
    // console.log(pendingReward)

    // let pendingFeeReward = await nodeVoting.callReadMethod('pendingFeeReward', '0xc566447b92bEf5490E9EE5A225bEb01b8f068b89');
    // console.log(pendingFeeReward)

    const isAccountant = await nodeVoting.callReadMethod('isAccountant', '0x4188d0da3a993f77bbbb57e15c16dccf035c1ef8');
    logger.info(`isAccountant(0x4188d0da3a993f77bbbb57e15c16dccf035c1ef8) : ${isAccountant}`);

    // const ret = await nodeVoting.callWriteMethod(
    //     signer,
    //     'revokeVote',
    //     '1',
    //     0,
    //     0,
    //     new BigNumber(1e18)
    // );
    // console.log(ret)

    // const ret = await nodeVoting.callWriteMethod(
    //     signer,
    //     'withdraw',
    //     '1',
    //     0,
    //     0
    // );
    // console.log(ret)

    // const ret = await nodeVoting.callWriteMethod(
    //     signer,
    //     'notifyRewardAmount',
    //     '1',
    //     1e17,
    //     ['0x5f115b259d391515066f18a0aeca8d6a28595761'],
    //     [new BigNumber(1e17)]
    // );
    // console.log(ret)

    // let status = await nodeStaking.callReadMethod('validatorStatusMap', '0xB763487CbEd3AC6a7401f7740d19B4401B948402')
    // console.log(status)


};

main().catch((e) => {
    logger.error(e.message);
});

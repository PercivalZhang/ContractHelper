import { ContractHelper } from './library/contract.helper';
import { LoggerFactory } from './library/LoggerFactory';
import { NetworkType, Web3Factory } from './library/web3.factory';
import BigNumber from 'bignumber.js';

// 0x6636Cc488964AA2E9F2644248601B2909eCC394E'  // greyscale
// '0x7Ce9A4f22FB3B3e2d91cC895bb082d7BD6F08525',
const network = NetworkType.HECO_TEST;

const nodeVoting = new ContractHelper(
    '0x7Ce9A4f22FB3B3e2d91cC895bb082d7BD6F08525',
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

// const pk = '0x98868c28aeb0329e235553ae21060cfc8408b58935e9c9998846bfd0ad10b98d'; // voter
// const pk = '0x48a1b691f6a569e28057b0fe4116e02d92740a441d32c98f6ff7da3a1a5b0ce1'; // Heco Test Admin
const pk = '0x98ba2e007611f7ffba67bd935c4b6e565afd936df1619f3b0fa2d4524de7c7bc' // accountant
const signer = web3.eth.accounts.privateKeyToAccount(pk);
logger.info(`signer address: ${signer.address}`);

const main = async () => {
    const balance = await web3.eth.getBalance(signer.address);
    logger.info(`signer balance: ${new BigNumber(balance).dividedBy(1e18).toNumber().toFixed(4)} HT`);

    const length = await nodeVoting.callReadMethod('getPoolLength');
    logger.info(length);

    const poolInfo1 = await nodeVoting.callReadMethod('poolInfo', 11);
    console.log(poolInfo1);

    const poolInfo = await nodeVoting.callReadMethod('poolInfo', 51);
    console.log(poolInfo);

    let pendingFeeReward = await nodeVoting.callReadMethod('pendingFeeReward', '0xc566447b92bEf5490E9EE5A225bEb01b8f068b89');
    console.log(pendingFeeReward)

    pendingFeeReward = await nodeVoting.callReadMethod('pendingFeeReward', '0x2512d871E388a97e35F5AE8C46344077166C9a07');
    console.log(pendingFeeReward)

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

    // const poolInfo = await nodeVoting.callReadMethod('poolInfo', 43);
    // console.log(poolInfo);
    // const ret = await nodeVoting.callWriteMethod(
    //     signer,
    //     'grantAccountant',
    //     '2',
    //     0,
    //     '0x69FcE84aB761D33e1C621986692946ec76c16Dee',
    // );
    // console.log(ret);
    // const pendingReward = await nodeVoting.callReadMethod('pendingReward', 43, '0x7BE5C02F3569F57d519621B68c8953fA9f2C071f');
    // console.log(pendingReward)

    // const pendingFeeReward = await nodeVoting.callReadMethod('pendingFeeReward', '0xD512aC286C6775F7108bA0a2eBca81e361111B24');
    // console.log(pendingFeeReward)

    // const isAccountant = await nodeVoting.callReadMethod('isAccountant', '0x09acc233e56361f3c32a57cf01cf34f5d56011ff');
    // logger.info(`isAccountant(0x09acc233e56361f3c32a57cf01cf34f5d56011ff) : ${isAccountant}`);

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
    //     1e18,
    //     ['0x3d2f31B71d37452B255A07b5C81Ede1d4F8eAcC7'],
    //     [new BigNumber(1e18)]
    // );
    // console.log(ret)

    // let status = await nodeStaking.callReadMethod('validatorStatusMap', '0xB763487CbEd3AC6a7401f7740d19B4401B948402')
    // console.log(status)


};

main().catch((e) => {
    logger.error(e.message);
});

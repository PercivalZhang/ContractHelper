import { ContractHelper } from '../../library/contract.helper';
import { LoggerFactory } from '../../library/LoggerFactory';
import { NetworkType } from '../../library/web3.factory';
import { SwissKnife } from '../../library/swiss.knife';
import { MasterChefHelper, PoolReceipt } from '../../library/master.chef';
import { SyrupChefHelper } from '../../library/syrup.chef';
import BigNumber from 'bignumber.js';
import { userInfo } from 'os';

const network = NetworkType.FANTOM;

const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('main');

const Config = {
    //LP挖矿
    farmChef: {
        address: '0xa7821c3e9fc1bf961e280510c471031120716c3d',
        methods: {
            poolLength: 'poolLength',
            userInfo: 'userInfo',
            poolInfo: 'poolInfo',
            pendingReward: 'pendingOXD',
            rewardToken: 'oxd',
        },
        pool: {
            lpToken: 'lpToken',
        },
    },
};

const main = async () => {
    const masterChef = new ContractHelper(Config.farmChef.address, './Fantom/0xDAO/master.chef.json', network);
    //const masterChef = new ContractHelper(network, Config.farmChef, './Fantom/0xDAO/master.chef.json');

    const userInfo = await masterChef.callReadMethod(
        Config.farmChef.methods.userInfo,
        0,
        '0xb97ebF6Ff02D23D141cB1676097cab9921A6226b',
    );
    console.log(userInfo);
    const myStakedBalance = new BigNumber(userInfo['0']);

    const token0 = await swissKnife.syncUpTokenDB('0x04068da6c83afcfa0e13ba15a6696662335d5b75');
    const token1 = await swissKnife.syncUpTokenDB('0xc165d941481e68696f43ee6e99bfb2b23e0e3114');

    const lptContract = new ContractHelper('0xD5fa400a24EB2EA55BC5Bd29c989E70fbC626FfF', './pair.json', network);
    const totalStakedLPT = await lptContract.callReadMethod('balanceOf', Config.farmChef.address);
    console.log(totalStakedLPT);
    const myRatio = myStakedBalance.dividedBy(totalStakedLPT);
    const reserves = await lptContract.callReadMethod('getReserves');
    const myToken0s = token0.readableAmountFromBN(reserves.reserve0.multipliedBy(myRatio));
    const myToken1s = token1.readableAmountFromBN(reserves.reserve1.multipliedBy(myRatio));

    const poolReceipt: PoolReceipt = {
        myRatio: Number.parseFloat(myRatio.toNumber().toFixed(8)),
        receipts: [
            { token: token0, balance: myToken0s },
            { token: token1, balance: myToken1s },
        ],
    };
    console.log(poolReceipt);
};

main().catch((e) => {
    logger.error(e.message);
});

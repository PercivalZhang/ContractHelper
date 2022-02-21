import { ContractHelper } from '../library/contract.helper';
import { LoggerFactory } from '../library/LoggerFactory';
import { NetworkType } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';
import { MasterChefHelper } from '../library/master.chef';
import { SyrupChefHelper } from '../library/syrup.chef';

const network = NetworkType.FANTOM;

const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('main');
//UniswapV2 Factory： https://ftmscan.com/address/0x152ee697f2e276fa89e96742e9bb9ab1f2e61be3#readContract
const Config = {
    //LP挖矿
    farmChef: {
        address: '0x2b2929e785374c651a81a63878ab22742656dcdd',
        methods: {
            poolLength: 'poolLength',
            userInfo: 'userInfo',
            poolInfo: 'poolInfo',
            pendingReward: 'pendingBOO',
            rewardToken: 'boo',
            totalAllocPoint: 'totalAllocPoint',
        },
        pool: {
            lpToken: 'lpToken',
            allocPoint: 'allocPoint',
        },
    },
    //BOO单币质押挖矿，BOO->xBOO
    syrupChef: {
        address: '0x2352b745561e7e6fcd03c093ce7220e3e126ace0',
        methods: {
            poolLength: 'poolLength',
            userInfo: 'userInfo',
            poolInfo: 'poolInfo',
            pendingReward: 'pendingReward',
            stakeToken: 'xboo',
            totalAllocPoint: 'totalAllocPoint',
        },
        pool: {
            rewardToken: 'RewardToken',
            allocPoint: 'allocPoint',
        },
    },
};

const masterChef = new MasterChefHelper(network, Config.farmChef, './SpookySwap/master.chef.json');
const syrupChef = new SyrupChefHelper(network, Config.syrupChef, './SpookySwap/syrup.chef.json');
const main = async () => {
    await masterChef.getFarmingReceipts('0xb97ebF6Ff02D23D141cB1676097cab9921A6226b');
    await syrupChef.getFarmingReceipts('0xb97ebF6Ff02D23D141cB1676097cab9921A6226b');
};

main().catch((e) => {
    logger.error(e.message);
});

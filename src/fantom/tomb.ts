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
        address: '0xcc0a87f7e7c693042a9cc703661f5060c80acb43',
        methods: {
            poolLength: ':2',
            userInfo: 'userInfo',
            poolInfo: 'poolInfo',
            pendingReward: 'pendingShare',
            rewardToken: 'tshare',
        },
        pool: {
            lpToken: 'token',
        },
    }
};

const masterChef = new MasterChefHelper(network, Config.farmChef, './Tomb/master.chef.json');
const main = async () => {
    await masterChef.getFarmingReceipts('0x881897b1FC551240bA6e2CAbC7E59034Af58428a');
    //await syrupChef.getFarmingReceipts('0xb97ebF6Ff02D23D141cB1676097cab9921A6226b');
};

main().catch((e) => {
    logger.error(e.message);
});

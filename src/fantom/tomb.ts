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
            totalAllocPoint: 'totalAllocPoint',
        },
        pool: {
            lpToken: 'token',
            allocPoint: 'allocPoint',
        },
    },
    masonry: '0x8764DE60236C5843D9faEB1B638fbCE962773B67', // 质押TShare，奖励Tomb
};
const getMasonryReceipt = async (userAddress: string) => {
    const masonry = new ContractHelper(Config.masonry, './Fantom/Tomb/masonry.json', network);
    masonry.toggleHiddenExceptionOutput();

    const shareAddress = await masonry.callReadMethod('share');
    const shareToken = await swissKnife.syncUpTokenDB(shareAddress);

    const tombAddress = await masonry.callReadMethod('tomb');
    const tombToken = await swissKnife.syncUpTokenDB(tombAddress);

    const myShares = await masonry.callReadMethod('balanceOf', userAddress);
    logger.info(`Masonry > my shares balance: ${shareToken.readableAmount(myShares)} ${shareToken.symbol}`);

    const rewardData = await masonry.callReadMethod('masons', userAddress);
    const pendingRewards = rewardData['rewardEarned'];
    logger.info(`Masonry > my pending rewards: ${tombToken.readableAmount(pendingRewards)} ${tombToken.symbol}`);
};
const masterChef = new MasterChefHelper(network, Config.farmChef, './Fantom/Tomb/master.chef.json');
const main = async () => {
    // await masterChef.getFarmingReceipts('0x881897b1FC551240bA6e2CAbC7E59034Af58428a');
    await getMasonryReceipt('0x881897b1FC551240bA6e2CAbC7E59034Af58428a');
};

main().catch((e) => {
    logger.error(e.message);
});

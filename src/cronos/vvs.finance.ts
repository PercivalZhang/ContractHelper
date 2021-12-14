import { ContractHelper } from '../library/contract.helper';
import { LoggerFactory } from '../library/LoggerFactory';
import { NetworkType } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';
import { MasterChefHelper } from '../library/master.chef';
import BigNumber from 'bignumber.js';

const network = NetworkType.CRONOS;

const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('main');
//UniswapV2 Factory：https://ftmscan.com/address/0xef45d134b73241eda7703fa787148d9c9f4950b0#readContract
const Config = {
    //LP挖矿
    farmChef: {
        address: '0xDccd6455AE04b03d785F12196B492b18129564bc',
        methods: {
            poolLength: 'poolLength',
            userInfo: 'userInfo',
            poolInfo: 'poolInfo',
            pendingReward: 'pendingVVS',
            rewardToken: 'vvs',
        },
        pool: {
            lpToken: 'lpToken',
        },
    },
    boostedFarms: [
        '0xefe02cb895b6e061fa227de683c04f3ce19f3a62', //FTM-Spirit LP
    ],
    inSpirit: '0x2fbff41a9efaeae77538bd63f1ea489494acdc08',
};

const masterChef = new MasterChefHelper(network, Config.farmChef, './chain.cronos/vvs.finance/craftsman.json');

const main = async () => {
    // pid - 47对应界面中的Staking > GINSPIRIT/SPIRIT LP
    await masterChef.getFarmingReceipts('0x7f48b031bb8fc2590db8a10eef0f2a738fbfc822');
    // for (const gauge of Config.boostedFarms) {
    //     await getBoostedFarmReceipt(gauge, '0x228f23A962D1ACabB1775E31FAF7D1B5bfa85B5E');
    // }
    //await getInSpiritReceipt('0x228f23A962D1ACabB1775E31FAF7D1B5bfa85B5E');
};

main().catch((e) => {
    logger.error(e.message);
});

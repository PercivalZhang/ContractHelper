import { ContractHelper } from '../../library/contract.helper';
import { LoggerFactory } from '../../library/LoggerFactory';
import { NetworkType } from '../../library/web3.factory';
import { SwissKnife } from '../../library/swiss.knife';
import { MasterChefHelper } from '../../library/master.chef';
import { SyrupChefHelper } from '../../library/syrup.chef';
import BigNumber from 'bignumber.js';

const Config = {
    //LP挖矿
    farmChef: {
        address: '0xb0523f9f473812fb195ee49bc7d2ab9873a98044',
        methods: {
            poolLength: 'poolLength',
            userInfo: 'userInfo',
            poolInfo: 'poolInfo',
            pendingReward: 'pendingTokens',
            rewardToken: 'ptp',
            totalAllocPoint: 'totalAllocPoint',
        },
        pool: {
            lpToken: 'lpToken',
            allocPoint: 'allocPoint',
        },
    },
    // vault: {
    //     vvsVVSAuto: '0xa6ff77fc8e839679d4f7408e8988b564de1a2dcd', //vvs自动复投
    //     vvsBIFI: '0x1a888d7b2abfd2b5046d8461e6d1703f654a8fc0', //vvs->BIFI
    // },
    ptp: '0x22d4002028f537599be9f666d1c4fa138522f9c8',
    poolManager: '0x66357dcace80431aee0a7507e2e361b7e2402370',
    vePTP: '0x5857019c749147eee22b1fe63500f237f3c1b692',
};

const network = NetworkType.AVALANCHE;

const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('farm');

const vePTPHelper = new ContractHelper(Config.vePTP, './Avalanche/platypus/vePTP.json', network);
const ptpPHelper = new ContractHelper(Config.ptp, './erc20.json', network);
const handlePendingReward = async (pid: number, pendingRewardData: any) => {
    // 每个质押的PTP每秒产生的vePTP
    const ptpPerSecond = await vePTPHelper.callReadMethod('generationRate');
    const totalStakedPTP = ptpPHelper.callReadMethod('balanceOf', Config.vePTP);

    const myStakedPTPBalance = await vePTPHelper.callReadMethod(
        'getStakedPtp',
        '0x881897b1FC551240bA6e2CAbC7E59034Af58428a',
    );
};

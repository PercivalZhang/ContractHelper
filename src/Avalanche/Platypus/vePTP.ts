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

const getVePTPInfor = async (userAddress: string) => {
    const ptpToken = await swissKnife.syncUpTokenDB(Config.ptp);
    const vePTPToken = await swissKnife.syncUpTokenDB(Config.vePTP);
    //获取vePTP供应量
    const totalVePTP = await vePTPHelper.callReadMethod('totalSupply');
    logger.info(`vePTP > total vePTP supply: ${vePTPToken.readableAmount(totalVePTP)} ${vePTPToken.symbol}`);
    //获取用户vePTP的余额
    const myVePTPBalance = await vePTPHelper.callReadMethod('balanceOf', userAddress);
    logger.info(`vePTP > my vePTP balance: ${vePTPToken.readableAmount(myVePTPBalance)} ${vePTPToken.symbol}`);
    //获取PTP总共质押量
    const totalStakedPTP = await ptpPHelper.callReadMethod('balanceOf', Config.vePTP);
    logger.info(
        `vePTP > total staked PTP: ${ptpToken.readableAmount(totalStakedPTP.toString()).toFixed(6)} ${ptpToken.symbol}`,
    );
    //获取用户质押的PTP数量
    const myStakedPTPBalance = await vePTPHelper.callReadMethod('getStakedPtp', userAddress);
    logger.info(`vePTP > my staked PTP: ${ptpToken.readableAmount(myStakedPTPBalance).toFixed(6)} ${ptpToken.symbol}`);
    //每个质押的PTP每秒产生的vePTP
    const vePTPPerSecond = await vePTPHelper.callReadMethod('generationRate');
    //基于用户质押的PTP数量的vePTP速率
    const myVePTPPerSecond = new BigNumber(vePTPPerSecond).multipliedBy(myStakedPTPBalance);
    logger.info(
        `vePTP > my vePTP emission rate: ${new BigNumber(myVePTPPerSecond)
            .multipliedBy(3600)
            .dividedBy(Math.pow(10, ptpToken.decimals))
            .dividedBy(Math.pow(10, vePTPToken.decimals))
            .toNumber()
            .toFixed(6)}/hour ${vePTPToken.symbol} `,
    );
    //获取用户待领取的vePTP数量
    const myClaimabeVePTPBalance = await vePTPHelper.callReadMethod('claimable', userAddress);
    logger.info(
        `vePTP > my claimable vePTP: ${vePTPToken.readableAmount(myClaimabeVePTPBalance).toFixed(6)} ${
            vePTPToken.symbol
        }`,
    );
};

const main = async () => {
    await getVePTPInfor('0x881897b1FC551240bA6e2CAbC7E59034Af58428a');
};

main().catch((e) => {
    logger.error(e.message);
});

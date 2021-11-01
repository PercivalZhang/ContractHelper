import { ContractHelper } from '../library/contract.helper';
import { LoggerFactory } from '../library/LoggerFactory';
import { NetworkType } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';
import { MasterChefHelper } from '../library/master.chef';
import BigNumber from 'bignumber.js';

const network = NetworkType.FANTOM;

const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('main');
//UniswapV2 Factory： https://ftmscan.com/address/0x152ee697f2e276fa89e96742e9bb9ab1f2e61be3#readContract
const Config = {
    //LP挖矿
    farmChef: {
        address: '0x9083ea3756bde6ee6f27a6e996806fbd37f6f093',
        methods: {
            poolLength: 'poolLength',
            userInfo: 'userInfo',
            poolInfo: 'poolInfo',
            pendingReward: 'pendingSpirit',
            rewardToken: 'spirit',
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

const getBoostedFarmReceipt = async (gaugeAddress: string, userAddress: string) => {
    const gauge = new ContractHelper(gaugeAddress, './SpiritSwap/gauge.json', network);
    gauge.toggleHiddenExceptionOutput();

    //获取质押token的地址
    const stakingTokenAddress = await gauge.callReadMethod('TOKEN');
    const stakingToken = await swissKnife.syncUpTokenDB(stakingTokenAddress);
    const lpt = await swissKnife.getLPTokenDetails(stakingTokenAddress);
    logger.info(
        `gauge[${lpt.token0.symbol}-${lpt.token1.symbol}] > staking token - ${stakingToken.symbol} : ${stakingToken.address}`,
    );
    //获取奖励token 的地址
    const rewardTokenAddress = await gauge.callReadMethod('SPIRIT');
    const rewardToken = await swissKnife.syncUpTokenDB(rewardTokenAddress);

    //获取目标用户质押的token - ADDY的数量
    const myStakedBalance = new BigNumber(await gauge.callReadMethod('balanceOf', userAddress));
    logger.info(
        `gauge[${lpt.token0.symbol}-${lpt.token1.symbol}] > my staked - ${myStakedBalance
            .dividedBy(Math.pow(10, stakingToken.decimals))
            .toNumber()
            .toFixed(6)} ${lpt.token0.symbol}-${lpt.token1.symbol} LP`,
    );

    //获取目标用户可领取的奖励token的数量
    const pendingReward = new BigNumber(await gauge.callReadMethod('rewards', userAddress));
    logger.info(
        `gauge[${lpt.token0.symbol}-${lpt.token1.symbol}] > pending reward - ${pendingReward
            .dividedBy(Math.pow(10, rewardToken.decimals))
            .toNumber()
            .toFixed(6)} ${rewardToken.symbol}`,
    );
};
const getInSpiritReceipt = async (userAddress: string) => {
    const inSpirit = new ContractHelper(Config.inSpirit, './SpiritSwap/inSpirit.json', network);
    inSpirit.toggleHiddenExceptionOutput();

    const spiritTokenAddress = await inSpirit.callReadMethod('token');
    const spiritToken = await swissKnife.syncUpTokenDB(spiritTokenAddress);

    //获取目标用户质押的token - ADDY的数量
    const myLockedInfo = await inSpirit.callReadMethod('locked', userAddress);
    const myLockedBalance = new BigNumber(myLockedInfo[0]);
    const myLockedEndAt = new BigNumber(myLockedInfo[1]);
    logger.info(
        `my locked balance - ${myLockedBalance.dividedBy(Math.pow(10, spiritToken.decimals)).toNumber().toFixed(6)} ${
            spiritToken.symbol
        }`,
    );
    const myLockedEndingDatetime = new Date(myLockedEndAt.multipliedBy(1000).toNumber());
    logger.info(`my locked spirits will be avaiable by ${myLockedEndingDatetime.toLocaleDateString()}`);
};
const masterChef = new MasterChefHelper(network, Config.farmChef, './SpiritSwap/master.chef.json');
//const syrupChef = new SyrupChefHelper(network, Config.syrupChef, './SpookySwap/syrup.chef.json');
const main = async () => {
    //await masterChef.getFarmingReceipts('0x228f23A962D1ACabB1775E31FAF7D1B5bfa85B5E');
    // for (const gauge of Config.boostedFarms) {
    //     await getBoostedFarmReceipt(gauge, '0x228f23A962D1ACabB1775E31FAF7D1B5bfa85B5E');
    // }
    await getInSpiritReceipt('0x228f23A962D1ACabB1775E31FAF7D1B5bfa85B5E');
};

main().catch((e) => {
    logger.error(e.message);
});

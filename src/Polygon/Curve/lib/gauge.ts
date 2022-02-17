import { ContractHelper } from '../../../library/contract.helper';
import { LoggerFactory } from '../../../library/LoggerFactory';
import { NetworkType } from '../../../library/web3.factory';
import { SwissKnife } from '../../../library/swiss.knife';
import { GaugeInfo, Reward } from './data.types';

const network = NetworkType.POLYGON;
const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('Gauge');

// const syncupGauges = async () => {
//     const gController = new ContractHelper(Config.gaugeController, './ETH/Curve/gauge.controller.json', network);
//     const gaugeSize = await gController.callReadMethod('n_gauges');
//     logger.info(`controller > detected total ${gaugeSize} gauges`);
//     for (let i = 0; i < gaugeSize; i++) {
//         const gaugeAddress = await gController.callReadMethod('gauges', i);
//         const gauge = new ContractHelper(gaugeAddress, './ETH/Curve/gauge.json', network);
//         const lptAddress = await gauge.callReadMethod('lp_token');
//         logger.info(`controller > gauge[${gaugeAddress}] > lpt: ${lptAddress}`);
//         fs.writeFileSync(path.resolve('data', 'curve.gauges.txt'), lptAddress + ' : ' + gaugeAddress + '\n', {
//             flag: 'a+',
//         });
//     }
// };

export const getGaugeInfo = async (gaugeAddress: string, rewardManagerAddress: string): Promise<GaugeInfo> => {
    const gaugeInfo: GaugeInfo = {
        address: '',
        relativeWeight: '',
        lptAddress: '',
        rewards: [],
    };
    gaugeInfo.address = gaugeAddress;
    const rewards: Reward[] = [];
    const gauge = new ContractHelper(gaugeAddress, './Polygon/Curve/gauge.json', network);
    const lptAddress = await gauge.callReadMethod('lp_token');
    gaugeInfo.lptAddress = lptAddress;
    logger.info(`getGaugeInfo > lp token: ${lptAddress}`);
    const rewardManager = new ContractHelper(rewardManagerAddress, './Polygon/Curve/reward.manager.json', network);
    const rewardCount = await rewardManager.callReadMethod('reward_count');
    logger.info(`getGaugeInfo > detected ${rewardCount} reward tokens`);
    for (let i = 0; i < rewardCount; i++) {
        const rewardTokenAddress = await rewardManager.callReadMethod('reward_tokens', i);
        const rewardToken = await swissKnife.syncUpTokenDB(rewardTokenAddress);
        const reward_data = await rewardManager.callReadMethod('reward_data', rewardTokenAddress);
        const reward_rate = reward_data['rate'];
        rewards.push({ token: rewardToken, rate: reward_rate, price: '' });
    }
    gaugeInfo.rewards = rewards;

    // const gController = new ContractHelper(Config.gaugeController, './ETH/Curve/gauge.controller.json', network);
    // const relativeWeight = await gController.callReadMethod('gauge_relative_weight', gaugeAddress);
    // gaugeInfo.relativeWeight = relativeWeight;
    return gaugeInfo;
};

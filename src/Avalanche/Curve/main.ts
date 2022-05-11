// search all NFT whose owner = booster
// get each NFT tokens
// add them all = TVL

//rewardPerBlock * (NFT_vLiquidity / total_vLiquidity)

import { LoggerFactory } from '../../library/LoggerFactory';
import BigNumber from 'bignumber.js';
import { ContractHelper } from '../../library/contract.helper';
import { SwissKnife } from '../../library/swiss.knife';
import { NetworkType } from '../../library/web3.factory';

const Network = NetworkType.AVALANCHE;
const logger = LoggerFactory.getInstance().getLogger('FarmingPool');
const gSwissKnife = new SwissKnife(Network);

const main = async () => {
    const userAddress = '0x3a56BEe1B6fb09A01da296790Be7e9fD10bE3D9F';
    const crvAddress = '0x47536F17F4fF30e64A96a7555826b8f9e66ec468';
    const avaxAddress = '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7';
    const gaugeAddress = '0x5B5CFE992AdAC0C9D48E05854B2d91C73a003858';

    const avaxToken = await gSwissKnife.syncUpTokenDB(avaxAddress);
    const crvToken = await gSwissKnife.syncUpTokenDB(crvAddress);
    const gauge = new ContractHelper(gaugeAddress, './Avalanche/Curve/gauge.json', Network);
    const reward1Amount = await gauge.callReadMethod('claimable_reward_write', userAddress, avaxAddress);
    console.log(reward1Amount);
    const rewardCRVAmount = await gauge.callReadMethod('claimable_reward', userAddress, crvAddress);
    logger.info(`claimable reward CRV: ${crvToken.readableAmount(rewardCRVAmount).toFixed(8)}`);
    const rewardAVAXAmount = await gauge.callReadMethod('claimable_reward', userAddress, avaxAddress);
    logger.info(`claimable reward AVAX: ${avaxToken.readableAmount(rewardAVAXAmount).toFixed(8)}`);
};

main().catch((e) => {
    logger.error(e.message);
});

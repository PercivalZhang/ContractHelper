import { ContractHelper } from '../../library/contract.helper';
import { LoggerFactory } from '../../library/LoggerFactory';
import { NetworkType } from '../../library/web3.factory';
import { SwissKnife } from '../../library/swiss.knife';
import BigNumber from 'bignumber.js';
import * as fs from 'fs';
import path from 'path';
import { ERC20Token } from '../../library/erc20.token';
const Config = {
    crv: '0xD533a949740bb3306d119CC777fa900bA034cd52',
};
const network = NetworkType.ETH_MAIN;

const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('main');

const main = async () => {
    const CRV = new ContractHelper(Config.crv, './ETH/Curve/token.crv.json', network);
    const now = Date.now();
    console.log(now);
    const oneDay = now + 24 * 3600 * 1000;
    console.log(oneDay);
    const endingDatetime = new Date(oneDay);
    logger.info(`staking > locked > unlockable by ${endingDatetime.toLocaleDateString()}`);
    const toMint = await CRV.callReadMethod('mintable_in_timeframe', 1642736320, 1642822720);
    console.log(toMint);
};

main().catch((e) => {
    logger.error(e.message);
});

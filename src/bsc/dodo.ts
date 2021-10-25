import { ContractHelper } from '../library/contract.helper';
import { LoggerFactory } from '../library/LoggerFactory';
import { NetworkType } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';
import BigNumber from 'bignumber.js';

const network = NetworkType.BSC;

const swissKnife = new SwissKnife(network);

const logger = LoggerFactory.getInstance().getLogger('main');
/**
 *
 */
const Config = {
    address: {
        masterChef: '0x01f9bfac04e6184e90bd7eafd51999ce430cc750',
    },
};

const SING = '0xCB898b0eFb084Df14dd8E018dA37B4d0f06aB26D';

const getMiningReceipts = async (userAddress: string) => {
    const masterChef = new ContractHelper(Config.address.masterChef, './DODO/master.chef.json', network);
    masterChef.toggleHiddenExceptionOutput();

    const poolLength = await masterChef.callReadMethod('poolLength');
    logger.info(`total ${poolLength} vaults`);

    for (let pid = 0; pid < poolLength; pid++) {
        const userInfo = await masterChef.callReadMethod('userInfo', pid, userAddress);

        const amount = new BigNumber(userInfo.amount);
        //if(amount.gt(0)) {
        logger.info(`pool[${pid}]: staked balance: ${amount.toNumber()}`);
        const poolInfo = await masterChef.callReadMethod('poolInfos', pid);
        await getDLPDetails(poolInfo.lpToken);
        //}
    }
};

const test = async () => {
    const goblin = new ContractHelper('0xA25aD83285e0D0989b1409b3755bE7E30bb821d7', './DODO/test.goblin.json', network);
    goblin.toggleHiddenExceptionOutput();

    const lptAddress = await goblin.callReadMethod('lpToken');
    const lpt = await swissKnife.getLPTokenDetails(lptAddress);
    console.log(lpt);
    const myShares = await goblin.callReadMethod('shares', 11014);
    logger.info(`my shares: ${myShares}`);

    const myLPBalance = await goblin.callReadMethod('shareToBalance', myShares);
    logger.info(`my lpt balance: ${myLPBalance}`);

    const myToken0Balance = lpt.reserve0
        .multipliedBy(myLPBalance)
        .dividedBy(lpt.totalSupply)
        .dividedBy(Math.pow(10, lpt.token0.decimals));
    logger.info(`my token0 balance: ${myToken0Balance.toNumber().toFixed(6)} ${lpt.token0.symbol}`);

    const myToken1Balance = lpt.reserve1
        .multipliedBy(myLPBalance)
        .dividedBy(lpt.totalSupply)
        .dividedBy(Math.pow(10, lpt.token1.decimals));
    logger.info(`my token1 balance: ${myToken1Balance.toNumber().toFixed(6)} ${lpt.token1.symbol}`);
};
/**
 * 获取用户参与的所有vaults的存款信息
 * @param userAddress
 * MasterChef Contract： 0x89d065572136814230A55DdEeDDEC9DF34EB0B76
 *
 */
const getDLPDetails = async (dlpAddress: string) => {
    const dlp = new ContractHelper(dlpAddress, './DODO/pool.json', network);
    dlp.toggleHiddenExceptionOutput();

    const name = await dlp.callReadMethod('name');
    logger.info(`name: ${name}`);
    const symbol = await dlp.callReadMethod('symbol');
    logger.info(`symbol: ${symbol}`);

    const baseTokenAddress = await dlp.callReadMethod('_BASE_TOKEN_');
    const baseToken = await swissKnife.syncUpTokenDB(baseTokenAddress);
    if (baseToken) logger.info(`base Token: ${baseToken.symbol}`);

    const quoteTokenAddress = await dlp.callReadMethod('_QUOTE_TOKEN_');
    const quoteToken = await swissKnife.syncUpTokenDB(quoteTokenAddress);
    if (quoteToken) logger.info(`quote Token: ${quoteToken.symbol}`);
};

const main = async () => {
    // await getMiningReceipts('0xD2050719eA37325BdB6c18a85F6c442221811FAC');
    await test();
};

main().catch((e) => {
    logger.error(e.message);
});

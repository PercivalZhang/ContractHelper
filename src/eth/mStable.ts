import { ContractHelper } from '../library/contract.helper';
import { LoggerFactory } from '../library/LoggerFactory';
import { NetworkType } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';
import BigNumber from 'bignumber.js';

const network = NetworkType.ETH_MAIN;

const swissKnife = new SwissKnife(network);

const logger = LoggerFactory.getInstance().getLogger('main');
/**
 *
 */
const Config = {
    feePool: {
        mUSD_BUSD: '0xfe842e95f8911dcc21c943a1daa4bd641a1381c6',
    },
};

const test = async (feePoolAddress: string, userAddress: string) => {
    const feePool = new ContractHelper(feePoolAddress, './mStable/feePool.json', network);
    feePool.toggleHiddenExceptionOutput();

    // const bTokenERC20 = await swissKnife.syncUpTokenDB(bTokenAddress);

    // const underlyingTokenAddress = await bToken.callReadMethod('underlying');
    // const underlyingToken = await swissKnife.syncUpTokenDB(underlyingTokenAddress);

    // const totalSupply = new BigNumber(await bToken.callReadMethod('totalSupply'));
    // const totalLoan = new BigNumber(await bToken.callReadMethod('totalLoan'));
    // const totalLoanable = new BigNumber(await bToken.callReadMethod('totalLoanable'));

    const assets = await feePool.callReadMethod('getBassets');
    console.log(assets);
};

const main = async () => {
    await test(Config.feePool.mUSD_BUSD, '0x0a7b83f9b400a1bc25a2e3306531bc713ed7f5d5');
};

main().catch((e) => {
    logger.error(e.message);
});

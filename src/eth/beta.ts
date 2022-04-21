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
    bToken: {
        USDT: '0xBe1c71c94FebcA2673DB2E9BD610E2Cc80b950FC',
    },
};

const getBTokenReceipts = async (bTokenAddress: string, userAddress: string) => {
    const bToken = new ContractHelper(bTokenAddress, './Beta/bToken.json', network);
    bToken.toggleHiddenExceptionOutput();

    const bTokenERC20 = await swissKnife.syncUpTokenDB(bTokenAddress);

    const underlyingTokenAddress = await bToken.callReadMethod('underlying');
    const underlyingToken = await swissKnife.syncUpTokenDB(underlyingTokenAddress);

    const totalSupply = new BigNumber(await bToken.callReadMethod('totalSupply'));
    const totalLoan = new BigNumber(await bToken.callReadMethod('totalLoan'));
    const totalLoanable = new BigNumber(await bToken.callReadMethod('totalLoanable'));

    const exchangeRatio = totalSupply.dividedBy(totalLoanable.plus(totalLoan));

    const myBTokenBalance = new BigNumber(await bToken.callReadMethod('balanceOf', userAddress));
    logger.info(
        `my bToken balance: ${myBTokenBalance.dividedBy(Math.pow(10, bTokenERC20.decimals)).toNumber().toFixed(6)}`,
    );

    const myUnderlyingTokenBalance = myBTokenBalance.dividedBy(exchangeRatio);
    logger.info(
        `my underlying token balance: ${myUnderlyingTokenBalance
            .dividedBy(Math.pow(10, underlyingToken.decimals))
            .toNumber()
            .toFixed(6)}`,
    );
};

const tToken = new ContractHelper('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', './erc20.json', network);
const main = async () => {
    // await getMiningReceipts('0xD2050719eA37325BdB6c18a85F6c442221811FAC');
    //await getBTokenReceipts(Config.bToken.USDT, '0x0a7b83f9b400a1bc25a2e3306531bc713ed7f5d5');
    const balance = await tToken.callReadMethod('balanceOf', '0xbecaa4ad36e5d134fd6979cc6780eb48ac5b5a93');
    logger.info(`balance: ${balance}`);
};

main().catch((e) => {
    logger.error(e.message);
});

import { ContractHelper } from './library/contract.helper';
import { LoggerFactory } from './library/LoggerFactory';
import { NetworkType } from './library/web3.factory';
import { SwissKnife } from './library/swiss.knife';
import BigNumber from 'bignumber.js';

const network = NetworkType.BSC;
/**
 * ETH
 *
 * Comptroller: https://cn.etherscan.com/address/0x6b4f20b2259eebb97945b6ef549a1c44fca6cd81#readProxyContract
 * BSC Comptroller: 0xa4bBE553CE1E77ebd7415f8ab873DC7E127238fb
 * Stake DeFIL -> eFIL: https://cn.etherscan.com/address/0x22b475f3e93390b7e523873ad7073337f4e56c2c#readContract
 * Stake LP::DeFIL/USDT --> DeFIL: https://cn.etherscan.com/address/0x2170c379b8bbc66bb8a77fb18136bf3250117cf6#readContract
 * Stake LP::FILIST/USDT --> DeFIL https://cn.etherscan.com/address/0x9e08bd9a1e3880902688b32d563046cab74d2f2f#readContract
 */

const swissKnife = new SwissKnife(network);

const logger = LoggerFactory.getInstance().getLogger('main');

const getStakeDetail = async (contractAddress: string, userAddress: string) => {
    const Stake = new ContractHelper(contractAddress, './DeFIL/test.json', network);
    Stake.toggleHiddenExceptionOutput();

    const asset = await Stake.callReadMethod('asset');
    const assetToken = await swissKnife.syncUpTokenDB(asset);
    logger.info(`asset - ${assetToken.symbol}: ${assetToken.address}`);

    const property = await Stake.callReadMethod('property');

    const accountState = await Stake.callReadMethod('accountState', userAddress);
    const myShares = new BigNumber(accountState[0]);

    const isLPT = await swissKnife.isLPToken(property);
    if (isLPT) {
        const lpt = await swissKnife.getLPTokenDetails(property);
        logger.info(`property - ${lpt.token0.symbol}-${lpt.token1.symbol} LP: ${property}`);
        logger.info(
            `my account shares: ${myShares.dividedBy(Math.pow(10, 18)).toNumber().toFixed(6)} ${lpt.token0.symbol}-${
                lpt.token1.symbol
            } LP`,
        );
    } else {
        const propertyToken = await swissKnife.syncUpTokenDB(property);
        logger.info(`property Token - ${propertyToken.symbol}: ${propertyToken.address}`);
        logger.info(
            `my account shares: ${myShares.dividedBy(Math.pow(10, propertyToken.decimals)).toNumber().toFixed(6)} ${
                propertyToken.symbol
            }`,
        );
    }

    const accruedRewards = await Stake.callReadMethod('accruedStored', userAddress);
    logger.info(
        `accrued rewards: ${new BigNumber(accruedRewards)
            .dividedBy(Math.pow(10, assetToken.decimals))
            .toNumber()
            .toFixed(6)} ${assetToken.symbol}`,
    );
};

const getLendBorrowDetail = async (userAddress: string) => {
    const comptroller = new ContractHelper(
        '0xa4bBE553CE1E77ebd7415f8ab873DC7E127238fb',
        './DeFIL/comptroller.json',
        network,
    );

    const allMarkets = await comptroller.callReadMethod('getAllMarkets');
    logger.info(allMarkets);

    for (const market of allMarkets) {
        let cERC20 = new ContractHelper(market, './DeFIL/cERC20Delegator.json', network);

        const symbol = await cERC20.callReadMethod('symbol');
        logger.info(`symbol: ${symbol}`);

        const underlying = await cERC20.callReadMethod('underlying');
        const underlyingToken = await swissKnife.syncUpTokenDB(underlying);
        logger.info(`underlying - ${underlyingToken.symbol}: ${underlyingToken.address}`);

        const mySnapshot = await cERC20.callReadMethod('getAccountSnapshot', userAddress);
        const depositBalance = new BigNumber(mySnapshot[1]);
        const borrowBalance = new BigNumber(mySnapshot[2]);

        logger.info(
            `my deposit balance: ${depositBalance
                .dividedBy(Math.pow(10, underlyingToken.decimals))
                .toNumber()
                .toFixed(8)} ${underlyingToken.symbol}`,
        );
        logger.info(
            `my borrowed balance: ${borrowBalance
                .dividedBy(Math.pow(10, underlyingToken.decimals))
                .toNumber()
                .toFixed(8)} ${underlyingToken.symbol}`,
        );
        if (symbol === 'cFILST') {
            cERC20 = new ContractHelper(market, './DeFIL/cERC20.FiListMarket.json', network);
            const accruedReward = await cERC20.callReadMethod('accruedEfilStored', userAddress);
            logger.info(`accrued rewards: ${accruedReward}`);
        } else if (symbol === 'ceFIL') {
            const accrued = await cERC20.callReadMethod('accruedStored', userAddress);
            logger.info(`accrued rewards: ${accrued}`);
        }
    }
};

const main = async () => {
    /**
     * {
     *     '0': '1000000000000000000',   // share
     *     '1': '1000552410553695243922107915495780241',
     *     '2': '0'
     * }
     */
    await getStakeDetail('0x6c753ca90bad578504314699580c8b01e067a765', '0xD2050719eA37325BdB6c18a85F6c442221811FAC');
    logger.info(`----------------------------------------------------`);
    await getStakeDetail('0xde6239b3138910c68f318e799b3d332925e9929f', '0xD2050719eA37325BdB6c18a85F6c442221811FAC');
    logger.info(`----------------------------------------------------`);
    await getStakeDetail('0x6b9ee349810e660dda9e3557c7a7412e5424ea39', '0xD2050719eA37325BdB6c18a85F6c442221811FAC');
    logger.info(`----------------------------------------------------`);
    await getLendBorrowDetail('0xD2050719eA37325BdB6c18a85F6c442221811FAC');
};

main().catch((e) => {
    logger.error(e.message);
});

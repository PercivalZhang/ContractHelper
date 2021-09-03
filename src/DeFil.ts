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
 *
 * Stake DeFIL -> eFIL: https://cn.etherscan.com/address/0x22b475f3e93390b7e523873ad7073337f4e56c2c#readContract
 * Stake LP::DeFIL/USDT --> DeFIL: https://cn.etherscan.com/address/0x2170c379b8bbc66bb8a77fb18136bf3250117cf6#readContract
 * Stake LP::FILIST/USDT --> DeFIL https://cn.etherscan.com/address/0x9e08bd9a1e3880902688b32d563046cab74d2f2f#readContract
 */

const swissKnife = new SwissKnife(network);

const logger = LoggerFactory.getInstance().getLogger('main');

const dflToken = swissKnife.syncUpTokenDB('0x6ded0F2c886568Fb4Bb6F04f179093D3D167c9D7');

const getStakeDetail = async (contractAddress: string, userAddress: string) => {
    const Stake = new ContractHelper(contractAddress, './DeFIL/stake.json', network);
    Stake.toggleHiddenExceptionOutput();

    /*
     * stake 分为两种：单币和LP
     * 单币：奖励eFil
     * LP：奖励平台币DFL
     * asset()就是获取奖励token的地址
     */
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
/*
 * Borrow/Lend provides 3 markets:
 *
 *  ceFIL/eFIL: '0x0c6D278afc34eAC4539ee33192E28275955A1BE6'    // 存eFIL, 奖励平台token - DFL（comptroller方法accruedStored()获取奖励数量）
 *  cmFIL/mFIL: '0xF9fCB79e8A22f4683f0708F76484fA589E62423a'    // 矿工相关，普通用户忽律
 *  cFILST/FILST: '0xC28207990B0EE4847e56f98b0b9F526b302A9273'  // 存FILST，可借出eFIL，同时享受FILST挖款产出的奖励token - eFIL（cToken方法accruedEfilStored）
 *
 */
const getLendBorrowDetail = async (userAddress: string) => {
    const comptroller = new ContractHelper(
        '0xa4bBE553CE1E77ebd7415f8ab873DC7E127238fb',
        './DeFIL/comptroller.json',
        network,
    );

    const dfl = await comptroller.callReadMethod('asset');
    const dflToken = await swissKnife.syncUpTokenDB(dfl);
    logger.info(`DeFIL platform token - ${dflToken.symbol}: ${dflToken.address}`);

    const allMarkets = await comptroller.callReadMethod('getAllMarkets');
    logger.info(allMarkets);

    for (const market of allMarkets) {
        const cERC20 = new ContractHelper(market, './DeFIL/cERC20Delegator.json', network);

        const symbol = await cERC20.callReadMethod('symbol');
        logger.info(`symbol: ${symbol}`);

        const underlying = await cERC20.callReadMethod('underlying');
        const underlyingToken = await swissKnife.syncUpTokenDB(underlying);
        logger.info(`underlying - ${underlyingToken.symbol}: ${underlyingToken.address}`);

        const mySnapshot = await cERC20.callReadMethod('getAccountSnapshot', userAddress);
        const depositBalance = new BigNumber(mySnapshot[1]);
        const borrowBalance = new BigNumber(mySnapshot[2]);

        const exchangeRate = await cERC20.callReadMethod('exchangeRateStored');
        logger.info(`exchange rate: ${exchangeRate}`);

        logger.info(
            `my deposit asset balance: ${depositBalance
                .multipliedBy(exchangeRate)
                .dividedBy(Math.pow(10, 18))
                .dividedBy(Math.pow(10, underlyingToken.decimals))
                .toNumber()
                .toFixed(8)} ${underlyingToken.symbol}`,
        );
        logger.info(
            `my borrowed balance: ${borrowBalance
                .multipliedBy(exchangeRate)
                .dividedBy(Math.pow(10, 18))
                .dividedBy(Math.pow(10, underlyingToken.decimals))
                .toNumber()
                .toFixed(8)} ${underlyingToken.symbol}`,
        );
        if (symbol === 'cFILST') {
            const fiListMarket = new ContractHelper(market, './DeFIL/cERC20.FiListMarket.json', network);
            const eFilAddress = await fiListMarket.callReadMethod('efilAddress');
            const eFilToken = await swissKnife.syncUpTokenDB(eFilAddress);
            const accruedRewardEFil = new BigNumber(
                await fiListMarket.callReadMethod('accruedEfilStored', userAddress),
            );
            logger.info(
                `accrued rewards: ${accruedRewardEFil
                    .dividedBy(Math.pow(10, eFilToken.decimals))
                    .toNumber()
                    .toFixed(6)} ${eFilToken.symbol}`,
            );
        } else if (symbol === 'ceFIL') {
            const accruedRewardDFL = new BigNumber(await comptroller.callReadMethod('accruedStored', userAddress));
            logger.info(
                `accrued rewards: ${accruedRewardDFL
                    .dividedBy(Math.pow(10, dflToken.decimals))
                    .toNumber()
                    .toFixed(6)} ${dflToken.symbol}`,
            );
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
    await getStakeDetail('0x272257bb03a2b99978a1e6badeba7ccba444d285', '0xD2050719eA37325BdB6c18a85F6c442221811FAC');   // 质押DFL
    logger.info(`----------------------------------------------------`);
    await getStakeDetail('0x6c753ca90bad578504314699580c8b01e067a765', '0xD2050719eA37325BdB6c18a85F6c442221811FAC');   // 质押FILST
    logger.info(`----------------------------------------------------`);
    await getStakeDetail('0xde6239b3138910c68f318e799b3d332925e9929f', '0xD2050719eA37325BdB6c18a85F6c442221811FAC');   // 质押LP FILST-USDT
    logger.info(`----------------------------------------------------`);
    await getStakeDetail('0x6b9ee349810e660dda9e3557c7a7412e5424ea39', '0xD2050719eA37325BdB6c18a85F6c442221811FAC');   // 质押LP eFIL-FILST
    logger.info(`----------------------------------------------------`);
    await getStakeDetail('0x6b6811a710f07b8ac430f6e172833e87c4bd8716', '0xD2050719eA37325BdB6c18a85F6c442221811FAC');   // 质押LP DFL-USDT
    logger.info(`----------------------------------------------------`);
    await getLendBorrowDetail('0xD2050719eA37325BdB6c18a85F6c442221811FAC');  // 借贷eFIL/FILST
};

main().catch((e) => {
    logger.error(e.message);
});

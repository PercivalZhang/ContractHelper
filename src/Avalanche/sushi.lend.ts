import { ContractHelper } from '../library/contract.helper';
import { LoggerFactory } from '../library/LoggerFactory';
import { NetworkType } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';
import { MasterChefHelper } from '../library/master.chef';
import { SyrupChefHelper } from '../library/syrup.chef';
import BigNumber from 'bignumber.js';

const network = NetworkType.BSC;

const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('main');
//UniswapV2 Factory： https://ftmscan.com/address/0x152ee697f2e276fa89e96742e9bb9ab1f2e61be3#readContract
const Config = {
    bentobox: {
        address: '0x0711b6026068f736bae6b213031fce978d48e026',
        tokens: {
            DAI: '0xd586e7f844cea2f87f50152665bcbc2c279d8d70',
            USDT: '0xc7198437980c041c805a1edcba50c1ce5db95118',
        },
    },
    kashiPairMediums: [
        //'0x685b570cfa3bf4889ce077f70b8a33a9b1c2e2c8'
        '0xea3d9d00de6c14bf8507f46c46c29292bbfa8d25',
    ],
};

const getBentoboxReceipts = async (userAddress: string) => {
    const bentobox = new ContractHelper(Config.bentobox.address, './SushiSwap/bentobox.json', network);
    for (const [key, tokenAddress] of Object.entries(Config.bentobox.tokens)) {
        const token = await swissKnife.syncUpTokenDB(tokenAddress);
        const myBalance = await bentobox.callReadMethod('balanceOf', token.address, userAddress);
        const myReadableBalance = token.readableAmount(myBalance);
        logger.info(`bentobox > my balance: ${myReadableBalance.toFixed(6)} ${token.symbol}`);
    }
};

const getLendBorrowReceipt = async (kashiPairMediumAddress: string, userAddress: string) => {
    const kashiPairMedium = new ContractHelper(kashiPairMediumAddress, './SushiSwap/kashi.pair.risk.v1.json', network);
    const kashiPairToken = await swissKnife.syncUpTokenDB(kashiPairMediumAddress);
    // 获取资产token信息
    const assetAddress = await kashiPairMedium.callReadMethod('asset');
    const assetToken = await swissKnife.syncUpTokenDB(assetAddress);
    // 获取抵押token信息
    const collateralAddress = await kashiPairMedium.callReadMethod('collateral');
    const collateralToken = await swissKnife.syncUpTokenDB(collateralAddress);
    const kashiTag = `kashi - ${assetToken.symbol}/${collateralToken.symbol}`;
    logger.info(`${kashiTag} > asset token - ${assetToken.symbol}: ${assetAddress}`);
    logger.info(`${kashiTag} > collateral token - ${collateralToken.symbol}: ${collateralAddress}`);
    // 获取抵押token的数量
    const totalCollateralTokens = await kashiPairMedium.callReadMethod('totalCollateralShare');
    logger.info(
        `${kashiTag} > total collateral token balance: ${collateralToken
            .readableAmount(totalCollateralTokens)
            .toFixed(6)} ${collateralToken.symbol}`,
    );
    const totalBorrow = await kashiPairMedium.callReadMethod('totalBorrow');
    const totalAsset = await kashiPairMedium.callReadMethod('totalAsset');
    const bentoboxAddress = await kashiPairMedium.callReadMethod('bentoBox');
    const bentobox = new ContractHelper(bentoboxAddress, './SushiSwap/bentobox.json', network);
    // 获取总计被借出的资产token数量
    const totalBorrowAssets = await bentobox.callReadMethod(
        'toShare',
        assetToken.address,
        totalBorrow['elastic'],
        true,
    );
    logger.info(
        `${kashiTag} > total borrowed asset: ${assetToken.readableAmount(totalBorrowAssets).toFixed(6)} ${
            assetToken.symbol
        }`,
    );
    // 获取未被借出的资产token的数量
    logger.info(
        `${kashiTag} > available asset: ${assetToken.readableAmount(totalAsset['elastic'])} ${assetToken.symbol}`,
    );
    // 计算资产token总的数量：未被借出的token + 借出的token
    const totalAssets = new BigNumber(totalAsset['elastic']).plus(totalBorrowAssets);
    logger.info(
        `${kashiTag} > total assets: ${assetToken.readableAmountFromBN(totalAssets).toFixed(6)} ${assetToken.symbol}`,
    );
    // 计算借出资产相对于总资产的占比
    const borrowedRatio = new BigNumber(totalBorrowAssets).dividedBy(totalAssets);
    logger.info(`${kashiTag} > borrowed ratio: ${borrowedRatio.toNumber().toFixed(6)}`);
    // 健康值：抵押token价值 / 借出token的价值
    // 获取用户存入资产token的份额数量
    const myFractions = new BigNumber(await kashiPairMedium.callReadMethod('balanceOf', userAddress));
    if (myFractions.gt(0)) {
        const myReadableFractions = kashiPairToken.readableAmountFromBN(myFractions);
        logger.info(`${kashiTag} > my lended KPT balance: ${myReadableFractions.toFixed(6)} ${kashiPairToken.symbol}`);
        // 根据用户资产份额，计算对应的资产token数量
        const myAssets = new BigNumber(myFractions).multipliedBy(totalAssets).dividedBy(totalAsset['base']);
        const myReadableAssets = assetToken.readableAmountFromBN(myAssets);
        logger.info(`${kashiTag} > my lended asset balance: ${myReadableAssets.toFixed(6)} ${assetToken.symbol}`);
    }
    // 获取用户抵押token的数量
    const userCollateralShares = new BigNumber(
        await kashiPairMedium.callReadMethod('userCollateralShare', userAddress),
    );
    if (userCollateralShares.gt(0)) {
        logger.info(
            `${kashiTag} > my collateral token balance: ${collateralToken
                .readableAmountFromBN(userCollateralShares)
                .toFixed(6)} ${collateralToken.symbol}`,
        );
    }
    // 获取用户借出token的数量
    const userBorrowPart = new BigNumber(await kashiPairMedium.callReadMethod('userBorrowPart', userAddress));
    // extra borrow fee - 0.0005 收取借出数量的0.0005，额外计入到你的借出账单中，因此要将此部分去除掉
    const userBorrowAssets = userBorrowPart
        .multipliedBy(totalBorrow['elastic'])
        .dividedBy(totalBorrow['base'])
        .dividedBy(1.0005); 
    logger.info(
        `${kashiTag} > my borrowed asset token balance: ${assetToken
            .readableAmountFromBN(userBorrowAssets)
            .toFixed(7)} ${assetToken.symbol}`,
    );
};

const main = async () => {
    //await masterChef.getFarmingReceipts('0xb97ebF6Ff02D23D141cB1676097cab9921A6226b');
    //await getBentoboxReceipts('0x881897b1FC551240bA6e2CAbC7E59034Af58428a');
    for (const kpmAddress of Config.kashiPairMediums) {
        //await getLendBorrowReceipt(kpmAddress, '0x881897b1FC551240bA6e2CAbC7E59034Af58428a')
        await getLendBorrowReceipt(kpmAddress, '0x881897b1FC551240bA6e2CAbC7E59034Af58428a');
    }
};

main().catch((e) => {
    logger.error(e.message);
});

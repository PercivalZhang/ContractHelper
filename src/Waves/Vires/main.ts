import { nodeInteraction } from '@waves/waves-transactions';
import { ERC20Token } from '../../library/erc20.token';
import { LoggerFactory } from '../../library/LoggerFactory';
import { TokenDB } from '../db.token';
import BigNumber from 'bignumber.js';

type TokenInfo = {
    token: ERC20Token;
    balance: string;
}
type VaultInfo = {
    asset: ERC20Token;
    aToken: ERC20Token;
    aTokenSupply: string;
    totalDeposit: string;
    totalBorrow: string;
}
const tokenDB = TokenDB.getInstance();
const logger = LoggerFactory.getInstance().getLogger('main');

const nodeUrl = 'https://nodes.wavesnodes.com/';
const VaultAccount = '3PEiD1zJWTMZNWSCyzhvBw9pxxAWeEwaghR'; //USDT
const userAddress = '3P5V82NzawM19QPrs8JoFFSctzxzjduUQUZ';

const getATokenInfo = async (vaultAddress: string): Promise<TokenInfo> => {
    const keyOfTokenId = 'aTokenId';
    const keyOfTokenDecimals = 'aTokenDecimals';
    const keyOfTokenName = 'aTokenName';
    const keyOfTokenCirculation = 'aTokenCirculation';

    const aTokenId = await nodeInteraction.accountDataByKey(keyOfTokenId, vaultAddress, nodeUrl);
    let aToken = await tokenDB.getByAddress(aTokenId.value.toString());
    if (!aToken) {
        logger.info(`getATokenInfo > token - ${aTokenId.value.toString()} does not exist in token db.`);
        const aTokenName = await nodeInteraction.accountDataByKey(keyOfTokenName, vaultAddress, nodeUrl);
        const aTokenDecimals = await nodeInteraction.accountDataByKey(keyOfTokenDecimals, vaultAddress, nodeUrl);

        aToken = new ERC20Token(
            aTokenId.value.toString(),
            aTokenName.value.toString(),
            Number.parseInt(aTokenDecimals.value.toString()),
        );
        logger.info(`getATokenInfo > added token - ${aTokenId.value.toString()} to db.`)
        await tokenDB.syncUp(aToken);
    }
    logger.info(`getATokenInfo > token - ${aTokenId.value.toString()} already existed in token db.`);
    const totalSupply = await nodeInteraction.accountDataByKey(keyOfTokenCirculation, vaultAddress, nodeUrl);
    return {
        token: aToken,
        balance: totalSupply.value.toString()
    };
};

const getVaultInfo = async(vaultAddress: string): Promise<VaultInfo> => {
    const vaultInfo: VaultInfo = {
        asset: undefined,
        aToken: undefined,
        aTokenSupply: '',
        totalDeposit: '',
        totalBorrow: ''
    }
    const assetIdItem = await nodeInteraction.accountDataByKey('assetId', vaultAddress, nodeUrl);
    const assetId = assetIdItem.value.toString();
    const assetInfo = await nodeInteraction.transactionById(assetId, nodeUrl);
    
    const assetToken = new ERC20Token(
        assetInfo['assetId'],
        assetInfo['name'],
        Number.parseInt(assetInfo['decimals']),
    );
    vaultInfo.asset = assetToken;
    // const assetBalance = await nodeInteraction.assetBalance(assetId, vaultAddress, nodeUrl);
    // console.log(assetBalance);
    await tokenDB.syncUp(assetToken);

    logger.info(`getVaultInfo > asset - ${assetToken.symbol}: ${assetToken.address}`);
    const aTokenInfo = await getATokenInfo(vaultAddress);    
    vaultInfo.aToken = aTokenInfo.token;
    vaultInfo.aTokenSupply = aTokenInfo.balance;
    logger.info(`getVaultInfo > aToken - ${aTokenInfo.token.symbol}: ${aTokenInfo.token.address}`);

    const totalDepositItem = await nodeInteraction.accountDataByKey('totalDeposit', vaultAddress, nodeUrl);
    const totalDeposit = new BigNumber(totalDepositItem.value.toString());
    vaultInfo.totalDeposit = totalDeposit.toString();
    logger.info(`getVaultInfo > total deposit: ${assetToken.readableAmountFromBN(totalDeposit).toFixed(4)} ${assetToken.symbol}`);
    
    const totalBorrowItem = await nodeInteraction.accountDataByKey('totalBorrow', vaultAddress, nodeUrl);
    const totalBorrow = new BigNumber(totalBorrowItem.value.toString());
    vaultInfo.totalBorrow = totalBorrow.toString();
    logger.info(`getVaultInfo > total borrowed: ${assetToken.readableAmountFromBN(totalBorrow).toFixed(4)} ${assetToken.symbol}`);

    return vaultInfo;
}

const getUserInfo = async(vaultAddress: string, userAddress: string) => {
    const vaultInfo = await getVaultInfo(vaultAddress);
    const asset = vaultInfo.asset;
    const aToken = vaultInfo.aToken;
    //获取用户存款aToken数量
    const keyOfATokenBalance = userAddress + '_aTokenBalance';
    const aTokenBalanceItem = await nodeInteraction.accountDataByKey(keyOfATokenBalance, vaultAddress, nodeUrl);
    const aTokenBalance = aTokenBalanceItem.value.toString();
    logger.info(`getUserInfo > aToken balance: ${aToken.readableAmount(aTokenBalanceItem.value.toString()).toFixed(4)} ${aToken.symbol}`);

    const assetPerAToken = new BigNumber(vaultInfo.totalDeposit).dividedBy(vaultInfo.aTokenSupply);
    const assetTokenBalance = assetPerAToken.multipliedBy(aTokenBalance);
    logger.info(`getUserInfo > asset balance: ${asset.readableAmount(assetTokenBalance.toString()).toFixed(5)} ${asset.symbol}`);

    const keyOfUseAsCollateral = userAddress + '_useAsCollateral';
    let useAsCollateral = await nodeInteraction.accountDataByKey(keyOfUseAsCollateral, vaultAddress, nodeUrl);
    logger.info(`getUserInfo > use as collateral: ${useAsCollateral.value}`);

    //获取当前vault中的借款数量
    const keyOfDebt = userAddress + '_debt';
    const debtAssetBalanceItem = await nodeInteraction.accountDataByKey(keyOfDebt, vaultAddress, nodeUrl);
    const debtAssetBalance = asset.readableAmount(debtAssetBalanceItem.value.toString());
    logger.info(`getUserInfo > debt asset balance: ${debtAssetBalance.toFixed(4)} ${asset.symbol}`);
}
const main = async () => {
    


    //await getVaultInfo(ReserveAccount);
    await getUserInfo(VaultAccount, userAddress);
};

main().catch((e) => {
    console.error(e.message);
});

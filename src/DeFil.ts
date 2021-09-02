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
 *
 * Stake DeFIL -> eFIL: https://cn.etherscan.com/address/0x22b475f3e93390b7e523873ad7073337f4e56c2c#readContract
 * Stake LP::DeFIL/USDT --> DeFIL: https://cn.etherscan.com/address/0x2170c379b8bbc66bb8a77fb18136bf3250117cf6#readContract
 * Stake LP::FILIST/USDT --> DeFIL https://cn.etherscan.com/address/0x9e08bd9a1e3880902688b32d563046cab74d2f2f#readContract
 */
const Vault = new ContractHelper('0x6c753ca90bad578504314699580c8b01e067a765', './DeFIL/test.json', network);
const swissKnife = new SwissKnife(network);

const logger = LoggerFactory.getInstance().getLogger('main');

const main = async () => {
    Vault.toggleHiddenExceptionOutput();
    /**
     * {
     *     '0': '1000000000000000000',   // share
     *     '1': '1000552410553695243922107915495780241',
     *     '2': '0'
     * }
     */
    const asset = await Vault.callReadMethod('asset');
    const assetToken = await swissKnife.syncUpTokenDB(asset);
    logger.info(`asset - ${assetToken.symbol}: ${assetToken.address}`);

    const property = await Vault.callReadMethod('property');
    const propertyToken = await swissKnife.syncUpTokenDB(property);
    logger.info(`property - ${propertyToken.symbol}: ${propertyToken.address}`);

    const accountState = await Vault.callReadMethod('accountState', '0xD2050719eA37325BdB6c18a85F6c442221811FAC');
    const myShares = new BigNumber(accountState[0]);
    logger.info(
        `my account shares: ${myShares.dividedBy(Math.pow(10, propertyToken.decimals)).toNumber().toFixed(6)} ${
            propertyToken.symbol
        }`,
    );

    const accruedRewards = await Vault.callReadMethod('accruedStored', '0xD2050719eA37325BdB6c18a85F6c442221811FAC');
    logger.info(
        `accrued rewards: ${new BigNumber(accruedRewards)
            .dividedBy(Math.pow(10, assetToken.decimals))
            .toNumber()
            .toFixed(6)} ${assetToken.symbol}`,
    );
};

main().catch((e) => {
    logger.error(e.message);
});

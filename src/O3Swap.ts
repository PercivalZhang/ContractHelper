import { ContractHelper } from './library/contract.helper';
import { LoggerFactory } from './library/LoggerFactory';
import { NetworkType } from './library/web3.factory';
import { SwissKnife } from './library/swiss.knife';
import BigNumber from 'bignumber.js';

const network = NetworkType.HECO;

const swissKnife = new SwissKnife(network);

const logger = LoggerFactory.getInstance().getLogger('main');

const o3TokenAddress = '0xee9801669c6138e84bd50deb500827b776777d28';

/**
 * 这两个vault质押产生的奖励，领取后将进入锁定状态，必须通过向第三个vault中质押O3-HUSD LP来解锁奖励
 * vault O3: 0xa36f7852114b5a907cfb0246949e432e67bf2126
 * vault BTC: 0x0423f3b26593db401a3382b483981e619c808dfc
 *
 * 该vault用于解锁上面两个vault质押收获的奖励，解锁速度跟质押的O3-HUSD LP数量有关
 * vault LP O3-HUSD(0xa83925175646527cd5f3c0ffe0f39a6c32af32fb): 0xee9801669c6138e84bd50deb500827b776777d28
 *
 * HUB BTC: 0xd98ee7ca1b33e60c75e3cd9493c566fc857592c8
 */

const getSingleVaultDetail = async (vaultAddress: string, userAddress: string) => {
    const o3Token = await swissKnife.syncUpTokenDB(o3TokenAddress);

    const vault = new ContractHelper(vaultAddress, './O3Swap/vault.single.json', network);
    vault.toggleHiddenExceptionOutput();

    const stakingTokenAddress = await vault.callReadMethod('StakingToken');
    const stakingToken = await swissKnife.syncUpTokenDB(stakingTokenAddress);
    logger.info(`vault staking token - ${stakingToken.symbol}: ${stakingToken.address}`);

    const myStakedBalance = new BigNumber(await vault.callReadMethod('getStakingAmount', userAddress));
    logger.info(
        `staked balance: ${myStakedBalance.dividedBy(Math.pow(10, stakingToken.decimals)).toNumber().toFixed(6)} ${
            stakingToken.symbol
        }`,
    );

    const myRewards = new BigNumber(await vault.callReadMethod('getTotalProfit', userAddress));
    logger.info(
        `pending rewards: ${myRewards.dividedBy(Math.pow(10, o3Token.decimals)).toNumber().toFixed(6)} ${
            o3Token.symbol
        }`,
    );
};

const getLPVaultDetail = async (vaultAddress: string, lptAddress: string, userAddress: string) => {
    const o3Token = await swissKnife.syncUpTokenDB('0xee9801669c6138e84bd50deb500827b776777d28');

    const vault = new ContractHelper(vaultAddress, './O3Swap/vault.lp.json', network);
    vault.toggleHiddenExceptionOutput();

    const lptDetail = await swissKnife.getLPTokenDetails(lptAddress);

    const myLPTBalance = await vault.callReadMethodWithFrom(
        'getStaked',
        userAddress,
        lptAddress, // LP O3-HUSD
    );
    logger.info(`staked balance: ${myLPTBalance} ${lptDetail.token1.symbol}-${lptDetail.token0.symbol} LP`);

    const lockedO3Balance = new BigNumber(await vault.callReadMethod('lockedOf', userAddress));
    logger.info(
        `locked rewards: ${lockedO3Balance.dividedBy(Math.pow(10, o3Token.decimals)).toNumber().toFixed(6)} ${
            o3Token.symbol
        }`,
    );

    const claimableUnlockedO3Balance = new BigNumber(
        await vault.callReadMethodWithFrom('claimableUnlocked', userAddress, lptAddress),
    );
    logger.info(
        `claimable unlocked rewards: ${claimableUnlockedO3Balance
            .dividedBy(Math.pow(10, o3Token.decimals))
            .toNumber()
            .toFixed(6)} ${o3Token.symbol}`,
    );

    const unlockSpeed = new BigNumber(await vault.callReadMethod('getUnlockSpeed', userAddress, lptAddress));

    logger.info(
        `user - ${userAddress} unlock speed: ${unlockSpeed
            .dividedBy(Math.pow(10, 8)) // 10**8
            .dividedBy(Math.pow(10, 18)) // LPT 10**18
            .toNumber()} ${o3Token.symbol}/Block`,
    );
};

const main = async () => {
    await getSingleVaultDetail(
        '0xa36f7852114b5a907cfb0246949e432e67bf2126',
        '0xD2050719eA37325BdB6c18a85F6c442221811FAC',
    ); // get vault - O3 receipt
    logger.info(`==============================================`);
    await getSingleVaultDetail(
        '0x0423f3b26593db401a3382b483981e619c808dfc',
        '0xD2050719eA37325BdB6c18a85F6c442221811FAC',
    ); // get vault - BTC receipt
    logger.info(`==============================================`);
    await getLPVaultDetail(
        '0xee9801669c6138e84bd50deb500827b776777d28',
        '0xa83925175646527cd5f3c0ffe0f39a6c32af32fb',
        '0xD2050719eA37325BdB6c18a85F6c442221811FAC',
    ); // get vault - O3-HUSD LP receipt
};

main().catch((e) => {
    logger.error(e.message);
});

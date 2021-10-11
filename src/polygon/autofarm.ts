import { ContractHelper } from '../library/contract.helper';
import { LoggerFactory } from '../library/LoggerFactory';
import { NetworkType } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';
import BigNumber from 'bignumber.js';

const network = NetworkType.POLYGON;

const swissKnife = new SwissKnife(network);

const logger = LoggerFactory.getInstance().getLogger('main');
/**
 *
 */
const Config = {
    address: {
        masterChef: '0x89d065572136814230A55DdEeDDEC9DF34EB0B76',
    },
};

const SING = '0xCB898b0eFb084Df14dd8E018dA37B4d0f06aB26D';

/**
 * 获取用户参与的所有vaults的存款信息
 * @param userAddress
 * MasterChef Contract： 0x89d065572136814230A55DdEeDDEC9DF34EB0B76
 *
 */
const getVaultReceipts = async (userAddress: string) => {
    const masterChef = new ContractHelper(Config.address.masterChef, './AutoFarm/master.chef.json', network);
    masterChef.toggleHiddenExceptionOutput();

    const poolLength = await masterChef.callReadMethod('poolLength');
    logger.info(`total ${poolLength} vaults`);

    for (let i = 0; i < poolLength; i++) {
        const myStakedTokenBalance = new BigNumber(await masterChef.callReadMethod('stakedWantTokens', i, userAddress));
        if (myStakedTokenBalance.gt(0)) {
            const poolInfo = await masterChef.callReadMethod('poolInfo', i);
            const stakedTokenAddress = poolInfo.want;
            const isLPToken = await swissKnife.isLPToken(stakedTokenAddress);
            if (isLPToken) {
                const lpToken = await swissKnife.getLPTokenDetails(stakedTokenAddress);
                logger.info(
                    `pool[${i}] > my staked token: ${myStakedTokenBalance
                        .dividedBy(Math.pow(10, 18))
                        .toNumber()
                        .toFixed(10)} ${lpToken.token0.symbol}/${lpToken.token1.symbol} LP`,
                );
            } else {
                const erc20Token = await swissKnife.syncUpTokenDB(stakedTokenAddress);
                logger.info(
                    `pool[${i}] > my staked token: ${myStakedTokenBalance
                        .dividedBy(Math.pow(10, erc20Token.decimals))
                        .toNumber()
                        .toFixed(10)} ${erc20Token.symbol}`,
                );
            }
        }
    }
};

const main = async () => {
    await getVaultReceipts('0xD2050719eA37325BdB6c18a85F6c442221811FAC');
};

main().catch((e) => {
    logger.error(e.message);
});

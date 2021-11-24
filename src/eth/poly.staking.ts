import { ContractHelper } from '../library/contract.helper';
import { LoggerFactory } from '../library/LoggerFactory';
import { NetworkType, Web3Factory } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';
import BigNumber from 'bignumber.js';
import * as fs from 'fs';
import path from 'path';
import nReadlines = require('n-readlines');

const network = NetworkType.ETH_MAIN;

const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('main');

const Config = {
    stakeManager: '0x5e3ef299fddf15eaa0432e6e66473ace8c13d908',
    maticToken: '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0',
};

//获取sSpell质押收据
const getAllValidators = async () => {
    const manager = new ContractHelper(Config.stakeManager, './PolyStaking/stake.manager.json', network);
    const vAmount = await manager.callReadMethod('NFTCounter');
    logger.info(`total ${vAmount} validators`);
    for (let i = 1; i < vAmount; i++) {
        const vContractAddress = await manager.callReadMethod('getValidatorContract', i);
        logger.info(`detected validator - ${vContractAddress}`);
        fs.writeFileSync(path.resolve('data', 'validators.txt'), vContractAddress + '\n', { flag: 'a+' });
    }
    logger.info(`>>>>>> add ${vAmount} validators address into data/validator.tx <<<<<<<`);
};

const getDelegationReceipt = async (userAddress: string, validatorAddress: string) => {
    const maticToken = await swissKnife.syncUpTokenDB(Config.maticToken);
    const vShares = new ContractHelper(validatorAddress, './PolyStaking/validator.share.json', network);
    const myStakedInfo = await vShares.callReadMethod('getTotalStake', userAddress);
    const myStakedBalance = new BigNumber(myStakedInfo[0]);
    if (myStakedBalance.gt(0)) {
        logger.info(
            `[${validatorAddress}] > my delegated ${myStakedBalance
                .dividedBy(Math.pow(10, maticToken.decimals))
                .toNumber()
                .toFixed(6)} ${maticToken.symbol}`,
        );
    }
};

const searchAll = async (userAddrss: string) => {
    const lines = new nReadlines(path.resolve('data/validators.txt'));

    let vAddress;
    let lineNumber = 1;

    while ((vAddress = lines.next())) {
        logger.info(`checking validator - ${vAddress}`);
        await getDelegationReceipt(userAddrss, vAddress.toString());
        lineNumber++;
    }
};

const main = async () => {
    //await getAllValidators();
    //await searchAll('0xc8fd682cf688e90213947bb7dc61fdf1b4908ca7');
    await searchAll('0xf062a8cfd80cd515c83db29d335685d5baf9ac5e');
};

main().catch((e) => {
    logger.error(e.message);
});

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
    FDT: '0xed1480d12be41d92f36f5f7bdd88212e381a3677',
    comitium: '0x4645d1cF3f4cE59b06008642E74E60e8F80c8b58',
    staking: '0xe98ae8cd25cdc06562c29231db339d17d02fd486',
    poolTokens: {
        MKR: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',
        wsOHM: '0xca76543cf381ebbb277be79574059e32108e3e65',
        RGT: '0xd291e7a03283640fdc51b121ac401383a46cc623',
        BOND: '0x0391d2021f89dc339f60fff84546ea23e337750f',
        YFI: '0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e',
        UMA: '0x04fa0d235c4abf4bcf4787af4cf447de572ef828',
        SLP: '0x2e30e758b3950dd9afed2e21f5ab82156fbdbbba', //wsOHM_FDT_SUSHI_LP
    },
    yieldFarmGenericTokens: {
        MKR: '0xed6bab596dcb7032142a36ec2048279d0047fa83',
        wsOHM: '0x0d728866da7780db8a0488adb5300b721ac5211d',
        RGT: '0xd291e7a03283640fdc51b121ac401383a46cc623',
        BOND: '0xa0a3637e09cd7beff98889946a4dfd60fe2db23c',
        YFI: '0x665286cb1237261cc2d2eda969ef0c12f60d3e76',
        UMA: '0x217c4636329aceb9309f83d2f57e460d3e6c96b5',
        SLP: '0x6666bc44f481dffe39803eb29f840125f03aee0e',
    },
};
const getDAOReceipts = async (userAddress: string) => {
    const fdtToken = await swissKnife.syncUpTokenDB(Config.FDT);
    const comitium = new ContractHelper(Config.comitium, './FiatDAO/comitium.json', network);
    const myStakedBalance = await comitium.callReadMethod('balanceOf', userAddress);
    const myReadableStakedBalance = fdtToken.readableAmount(myStakedBalance);
    logger.info(`DAO: my staked balance: ${myReadableStakedBalance.toFixed(4)} ${fdtToken.symbol}`);
    const myVotingPower = await comitium.callReadMethod('votingPower', userAddress);
    const myReadableVotingPower = fdtToken.readableAmount(myVotingPower);
    logger.info(`DAO: my voting power: ${myReadableVotingPower.toFixed(4)}`);
};

//获取质押挖矿收据
const getStakingReceipts = async (userAddress: string) => {
    const fdtToken = await swissKnife.syncUpTokenDB(Config.FDT);
    const staking = new ContractHelper(Config.staking, './FiatDAO/staking.json', network);
    for (const [symbol, tokenAddress] of Object.entries(Config.poolTokens)) {
        //获取质押token的数量
        const myBalance = await staking.callReadMethod('balanceOf', userAddress, tokenAddress);
        if(new BigNumber(myBalance).gt(0)) {
            const poolToken = await swissKnife.syncUpTokenDB(tokenAddress);
            const myReadableBalance = poolToken.readableAmount(myBalance.toString());
            logger.info(`pool - ${poolToken.symbol} > my staked balance: ${myReadableBalance.toFixed(6)} ${poolToken.symbol}`);
            //通过YieldFarmGenericToken合约的方法 - massHarvest获取奖励token数量
            const reward = new ContractHelper(Config.yieldFarmGenericTokens[symbol], './FiatDAO/generic.token.json', network);
            const myRewards = await reward.callReadMethodWithFrom('massHarvest', userAddress);
            const myReadableRewards = fdtToken.readableAmount(myRewards);
            logger.info(`pool - ${poolToken.symbol} > my reward balance: ${myReadableRewards.toFixed(6)} ${fdtToken.symbol}`);
        }
    }

};

const main = async () => {
    //await getStakingReceipts('0xde77bb542310eb511b861e308dc874745bd3d4a7'); // MKR
    //await getStakingReceipts('0x39d12116298f3b2b55e53e7b99c0bf47041761df');
    await getDAOReceipts('0x10dc1d2f35992b28c5160c2f9fc9582735298d78')
};

main().catch((e) => {
    logger.error(e.message);
});

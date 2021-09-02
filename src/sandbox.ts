import { ContractHelper } from './library/contract.helper';
import { LoggerFactory } from './library/LoggerFactory';
import { NetworkType, Web3Factory } from './library/web3.factory';
import * as Sleep from 'sleep';
import BigNumber from 'bignumber.js';
import * as path from 'path';
import fs from 'fs';

const network = NetworkType.ETH_MAIN;

const Sand = new ContractHelper('0x50f5474724e0ee42d9a4e711ccfb275809fd6d4a', './sandbox/land.json', network);

const logger = LoggerFactory.getInstance().getLogger('main');

const main = async () => {
    Sand.toggleHiddenExceptionOutput();

    const symbol = await Sand.callReadMethod('symbol');
    logger.info(`symbol: ${symbol}`);

    /**
     * 地图size：408 * 408
     * 坐标远原点（0，0）在地图中心点
     * 1*1 最小单元地块
     * 共计 408 * 408 块 1*1 size的地块
     */
    let i = 0;
    for(let x = -204; x <= 203; x++) {
        for(let y = -204; y <= 203; y++) {
            const tokenId = (y + 204) * 408 + x + 204;  // NFT token - Sand tokenId计算公式
            logger.info(`[${i}] sand at [${x}, ${y}]: ${tokenId}`);
            const owner = await Sand.callReadMethod('ownerOf', tokenId);
            if(owner) {
                const tokenURI = await Sand.callReadMethod('tokenURI', tokenId);
                logger.warn(`detected minted sand - ${tokenId} owned by: ${owner}`);
                logger.warn(`sand - ${tokenId} URI: ${tokenURI}`);
            }
            i = i + 1;
            Sleep.sleep(1);
        }
    }
};

main().catch((e) => {
    logger.error(e.message);
});

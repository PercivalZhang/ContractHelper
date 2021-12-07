import axios, { AxiosResponse } from 'axios';
import { LoggerFactory } from './LoggerFactory';

const logger = LoggerFactory.getInstance().getLogger('Scanner');

export class ChainScanner {
    private static instance: ChainScanner;

    private constructor() {}

    static getInstance() {
        if (!ChainScanner.instance) {
            ChainScanner.instance = new ChainScanner();
        }
        return ChainScanner.instance;
    }

    public async fetchData(uri: string): Promise<JSON> {
        try {
            const res = await axios.get(uri);
            logger.debug(`http status: ${res.status}`);
            if (res.status === 200) {
                return JSON.parse(res.data.result);
            }
            return null;
        } catch(e) {
            logger.error(e.toString());
            return null;
        }
    }

    // public async getTokenTransferEventsByAccount(
    //     address: string,
    //     startBlockNum: number,
    //     endBlockNum: number,
    // ): Promise<any> {
    //     const url = `https://api.bscscan.com/api?module=account&action=tokentx&address=${address}&startblock=${startBlockNum}&endblock=${endBlockNum}&sort=asc&apikey=T4SX1JYT5D5J62CNBE9YJRT1G57ZEC24VW`;
    //     logger.debug(url);
    //     const res = await axios.get(url);
    //     logger.debug(`http status: ${res.status}`);
    //     if (res.status === 200) {
    //         return res.data.result;
    //     }
    //     return [];
    // }

    // public async getEarnDEFIAPY(contractAddress: string): Promise<string> {
    //     const url = 'https://api.earndefi.finance/apy/' + contractAddress;
    //     const res = await axios.get(url);
    //     logger.debug(`http status: ${res.status}`);
    //     if (res.status === 200) {
    //         return res.data;
    //     }
    //     return null;
    // }
}

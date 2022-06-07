import axios, { AxiosResponse } from 'axios';
import { LoggerFactory } from './LoggerFactory';

const logger = LoggerFactory.getInstance().getLogger('Scanner');

export class CoinMarketcap {
    private static instance: CoinMarketcap;

    private constructor() {}

    static getInstance() {
        if (!CoinMarketcap.instance) {
            CoinMarketcap.instance = new CoinMarketcap();
        }
        return CoinMarketcap.instance;
    }

    // await axios.get('https://sandbox-api.coinmarketcap.com/v1/cryptocurrency/listings/latest', {
    //   headers: {
    //     'X-CMC_PRO_API_KEY': 'b54bcf4d-1bca-4e8e-9a24-22ff2c3d462c',
    //   },
    // });
  

    public async fetchData(uri: string): Promise<any> {
        try {
            const res = await axios.get(uri, {
                headers: {
                    'X-CMC_PRO_API_KEY': 'b568f349-ef12-4dfc-8196-d58c7fca6660',
                }
            });
            //console.log(res);
            logger.debug(`http status: ${res.status}`);
            if (res.status === 200) {
                return res.data;
            }
            return null;
        } catch(e) {
            logger.error(e.toString());
            return null;
        }
    }

    public async getTokenUSDPrice(symbol: string): Promise<string> {
        const url = 'https://pro-api.coinmarketcap.com/v2/tools/price-conversion?amount=1&symbol=' + symbol
        const priceData = await this.fetchData(url)
        const price = priceData === null ? '0' : priceData.data[0]['quote']['USD']['price']
        return price
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



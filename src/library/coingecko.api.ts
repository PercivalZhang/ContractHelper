import axios, { AxiosResponse } from 'axios';
import * as path from 'path';
import { JSONDBBuilder } from './db.json';
import { LoggerFactory } from './LoggerFactory';

const logger = LoggerFactory.getInstance().getLogger('Scanner');

const IDSDB = new JSONDBBuilder(path.resolve('db/coingecko.ids.db'), true, true, '/');

export class CoinGeckoAPI {
    private static instance: CoinGeckoAPI;

    private constructor() {}

    static getInstance() {
        if (!CoinGeckoAPI.instance) {
            CoinGeckoAPI.instance = new CoinGeckoAPI();
        }
        return CoinGeckoAPI.instance;
    }
  
    public async fetchData(uri: string): Promise<any> {
        try {
            const res = await axios.get(uri, {});
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

    public async syncCoins()  {
        const ids = await this.fetchData(`https://api.coingecko.com/api/v3/coins/list`)
        IDSDB.push('/', ids);
    }

    public async findIdBySymbol(symbol: string, name: string) {
        const ids = await IDSDB.getData('/')
        let i = 0
        console.log(ids[0])
        for(let i = 0; i < ids.length; i++) {
            if(ids[i]['symbol'].toLowerCase === symbol.toLowerCase) {
                return ids[i]['id']
            }
        }
        return ''
    }
    // public async getTokenUSDPrice(symbol: string): Promise<string> {
    //     const url = `https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd&ids=${assetCoingeckoIds.join(',')}`
    //     const priceData = await this.fetchData(url)
    //     const price = priceData === null ? '0' : priceData.data[0]['quote']['USD']['price']
    //     return price
    // }
}

const main = async () => {
    const coingeckoAPI = CoinGeckoAPI.getInstance()
    //await coingeckoAPI.syncCoins()
    // const id = await coingeckoAPI.findIdBySymbol('hbtc')
    // console.log(id)

};

main().catch((e) => {
    logger.error(e.message);
});






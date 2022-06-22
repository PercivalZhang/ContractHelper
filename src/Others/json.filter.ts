import * as path from 'path'
import fs from 'fs'
import { LoggerFactory } from '../library/LoggerFactory';
import { ContractHelper } from '..//library/contract.helper';
import { NetworkType } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';


const logger = LoggerFactory.getInstance().getLogger('main');

const network = NetworkType.CUBE;

const swissKnife = new SwissKnife(network);


const main = async () => {
    const pathOthersFile = path.resolve('data', 'others.txt');
    const items = JSON.parse(fs.readFileSync(pathOthersFile).toString());

    // const pathExcludeFile = path.resolve('data', 'excludes.txt');
    // const excludeContents = fs.readFileSync(pathExcludeFile).toString();
    // const excludeItems = []
    // excludeContents.split(/\r?\n/).forEach(function(address) {
    //     address = address.toLowerCase() 
    //     excludeItems.push(address)
    // })
    
    // console.log(excludeItems)

    // logger.info(`before filter out > item size: ${items.length}`)
    // const filterOutData = []

    // items.forEach(function(item) {
    //     const address = item['addr'].toLowerCase()
    //     if(excludeItems.includes(address)) {
    //         logger.warn(`filter out > ${address}`)
    //     } else {
    //         filterOutData.push(item)
    //     }
    // })

    // logger.info(`after filtered out > item size: ${filterOutData.length}`)

    // const pathIncludeFile = path.resolve('data', 'includes.txt');
    // fs.writeFileSync(pathIncludeFile, JSON.stringify(filterOutData))

    const newItems = []
    for(const item of items) {
        if(item['合约类型'] === 'ERC20') {
            const token = new ContractHelper(item['addr'], './erc20.json', NetworkType.CUBE)
            const erc20 = await swissKnife.syncUpTokenDB(item['addr'])

            const totalSupply = await token.callReadMethod('totalSupply')
            logger.info(`token - ${erc20.symbol}: ${erc20.readableAmount(totalSupply).toFixed(4)}`)

            item['资产数量'] = erc20.readableAmount(totalSupply).toFixed(4)
            item['资产名'] = erc20.symbol
        }
        newItems.push(item)
    }
    const pathIncludeFile = path.resolve('data', 'includes.txt')
    fs.writeFileSync(pathIncludeFile, JSON.stringify(newItems))

};

main().catch((e) => {
    logger.error(e.message);
});
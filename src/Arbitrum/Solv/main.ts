import { LoggerFactory } from '../../library/LoggerFactory';
import BigNumber from 'bignumber.js';
import { ContractHelper } from '../../library/contract.helper';
import { SwissKnife } from '../../library/swiss.knife';
import { Config } from './config';
import { SwapQuoter } from '@uniswap/v3-sdk';

const logger = LoggerFactory.getInstance().getLogger('solv');
const gSwissKnife = new SwissKnife(Config.network);
const lpt = new ContractHelper(Config.SLP, './pair.json', Config.network)
const sushiRouter = new ContractHelper(Config.sushi_router, './SushiSwap/router.json', Config.network)

const main = async () => {
    const lpDetails = await gSwissKnife.getLPTokenDetails(Config.SLP)
    const token0 = lpDetails.token0 // STRP
    const token1 = lpDetails.token1 // USDC
    
    const dsaToken0Balance = await gSwissKnife.getERC20TokenBalance(token0.address, Config.DSA)
    const dsaToken1Balance = await gSwissKnife.getERC20TokenBalance(token1.address, Config.DSA)
    logger.info(`voucher > DSA account token0 - ${token0.symbol} balance: ${dsaToken0Balance.toFixed(4)}`)
    logger.info(`voucher > DSA account token1 - ${token1.symbol} balance: ${dsaToken1Balance.toFixed(4)}`)
    
    let totalLPTBalance = new BigNumber(0) 
    //遍历market making pools，获取每个pool里面资产token的数量
    for (const pool of Config.market_making_pools) {
        const lptBalance = await lpt.callReadMethod('balanceOf', pool)
        if(new BigNumber(lptBalance).gt(0)) {
            logger.info(`market pool SLP balance: ${lptBalance}`)
            totalLPTBalance = totalLPTBalance.plus(lptBalance)
            const ratio = new BigNumber(lptBalance).dividedBy(lpDetails.totalSupply)
            const token0Amount = token0.readableAmountFromBN(ratio.multipliedBy(lpDetails.reserve0))
            const token1Amount = token1.readableAmountFromBN(ratio.multipliedBy(lpDetails.reserve1))
            logger.info(`market pool > token0 - ${token0.symbol}  balance: ${token0Amount.toFixed(4)}`)
            logger.info(`market pool > token1 - ${token1.symbol}  balance: ${token1Amount.toFixed(4)}`)
        }
    }
    const vRatio = totalLPTBalance.dividedBy(lpDetails.totalSupply)
    const vToken0Amount = token0.readableAmountFromBN(vRatio.multipliedBy(lpDetails.reserve0))
    const vToken1Amount = token1.readableAmountFromBN(vRatio.multipliedBy(lpDetails.reserve1))
    logger.info(`voucher > token0 - ${token0.symbol}  balance: ${vToken0Amount.toFixed(4)}`)
    logger.info(`voucher > token1 - ${token1.symbol}  balance: ${vToken1Amount.toFixed(4)}`)
    const amountsOut = await sushiRouter.callReadMethod('getAmountsOut', new BigNumber(1).multipliedBy(Math.pow(10, token0.decimals)), [token0.address, token1.address])
    logger.info(`voucher > token 0 - ${token0.symbol} price: ${token1.readableAmount(amountsOut[1]).toFixed(4)} ${token1.symbol}`)
};

main().catch((e) => {
    logger.error(e.message);
});

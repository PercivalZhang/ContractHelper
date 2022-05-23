import { ContractHelper } from '../../library/contract.helper';
import { LoggerFactory } from '../../library/LoggerFactory';
import { NetworkType } from '../../library/web3.factory';
import { SwissKnife } from '../../library/swiss.knife';

import BigNumber from 'bignumber.js';
BigNumber.config({ EXPONENTIAL_AT: [-7, 50] })

const DoubleScale = 1e36
const ExpScale = 1e18
const unitrollerAddress = '0x817af6cfAF35BdC1A634d6cC94eE9e4c68369Aeb';
const auETHMarket = '0xca9511b610ba5fc7e311fdef9ce16050ee4449e9'
const auPLYMarket = '0xc9011e629c9d0b8b1e4a2091e123fbb87b3a792c'
const auUSDC = '0x4f0d864b1ABf4B701799a0b30b57A22dFEB5917b'

const userAddress = '0x4deb56a42fc63650b2f0bfb9abe1850e3a091371'
//const userAddress = '0x881897b1FC551240bA6e2CAbC7E59034Af58428a'

const network = NetworkType.AURORA;

const swissKnife = new SwissKnife(network);

const logger = LoggerFactory.getInstance().getLogger('main');

const gUnitroller = new ContractHelper(unitrollerAddress, './Auraro/Aurigami/unitroller.json', network);

const calculateRewardBorrowIndex = async(rewardType: number, auTokenAddress: string, totalBorrowsOfAuToken: BigNumber, marketBorrowIndex: BigNumber): Promise<BigNumber> => {
    try {
        const auToken = await swissKnife.syncUpTokenDB(auTokenAddress)
        const auTokenHelper = new ContractHelper(auTokenAddress, './Auraro/Aurigami/au.token.json', network);
        //const totalBorrowsOfAuToken = await auTokenHelper.callReadMethod('totalBorrows');
        logger.info(`calculateRewardBorrowIndex > total borrow auToken - ${auToken.symbol}: ${totalBorrowsOfAuToken.toString()}`)

        // Exp.wrap
        //const marketBorrowIndex = await auTokenHelper.callReadMethod('borrowIndex');

        const borrowState = await gUnitroller.callReadMethod('rewardBorrowState', rewardType, auTokenAddress)
        logger.info(`calculateRewardBorrowIndex > borrowState index: ${borrowState['index']}`)

        const borrowSpeed = await gUnitroller.callReadMethod('rewardSpeeds', rewardType, auTokenAddress, false)
        logger.info(`calculateRewardBorrowIndex > borrow speed: ${borrowSpeed}`)

        const blockTimestamp = await swissKnife.getLatestBlockTimestamp();
        logger.info(`calculateRewardBorrowIndex > block timestamp: ${blockTimestamp}`)

        const deltaTimestamps = new BigNumber(blockTimestamp).minus(borrowState['timestamp'])
        logger.info(`calculateRewardBorrowIndex > delta timestamps: ${deltaTimestamps.toNumber().toString()}`)

        if(deltaTimestamps.gt(0) && new BigNumber(borrowSpeed).gt(0)) {
            const borrowAmount = new BigNumber(totalBorrowsOfAuToken).multipliedBy(ExpScale).dividedBy(marketBorrowIndex)
            const rewardAccrued = deltaTimestamps.multipliedBy(borrowSpeed)
            logger.info(`calculateRewardBorrowIndex > reward accrued: ${rewardAccrued.toString()}`)

            const ratio = borrowAmount.gt(0) ? rewardAccrued.multipliedBy(DoubleScale).dividedBy(borrowAmount) : new BigNumber(0);
            // remember double scale rewardAccured by multply 1e36
            //const ratio = rewardAccrued.multipliedBy(DoubleScale).dividedBy(totalSupplyOfAuToken)
            const index = new BigNumber(borrowState['index']).plus(ratio)
            logger.info(`calculateRewardBorrowIndex > new borrowState index: ${index.toString()}`)
            return index
        }
        return new BigNumber(borrowState['index'])
    } catch(e) {
        logger.error(`calculateRewardBorrowIndex > ${e.message}`)
    }
}

const calculateRewardSupplyIndex = async(rewardType: number, auTokenAddress: string): Promise<BigNumber> => {
    try {
        const auToken = await swissKnife.syncUpTokenDB(auTokenAddress)
        const auTokenHelper = new ContractHelper(auTokenAddress, './Auraro/Aurigami/au.token.json', network);
        const totalSupplyOfAuToken = await auTokenHelper.callReadMethod('totalSupply');
        logger.info(`calculateRewardSupplyIndex > auToken - ${auToken.symbol}: ${totalSupplyOfAuToken}`)

        const supplyState = await gUnitroller.callReadMethod('rewardSupplyState', rewardType, auTokenAddress)
        logger.info(`calculateRewardSupplyIndex > supplyState index: ${supplyState['index']}`)

        const supplySpeed = await gUnitroller.callReadMethod('rewardSpeeds', rewardType, auTokenAddress, true)
        logger.info(`calculateRewardSupplyIndex > supply speed: ${supplySpeed}`)

        const blockTimestamp = await swissKnife.getLatestBlockTimestamp();
        logger.info(`calculateRewardSupplyIndex > block timestamp: ${blockTimestamp}`)

        const deltaTimestamps = new BigNumber(blockTimestamp).minus(supplyState['timestamp'])
        logger.info(`calculateRewardSupplyIndex > delta timestamps: ${deltaTimestamps.toNumber().toString()}`)

        if(deltaTimestamps.gt(0) && new BigNumber(supplySpeed).gt(0)) {
            const rewardAccrued = deltaTimestamps.multipliedBy(supplySpeed)
            logger.info(`calculateRewardSupplyIndex > reward accrued: ${rewardAccrued.toString()}`)
            // remember double scale rewardAccured by multply 1e36
            const ratio = rewardAccrued.multipliedBy(DoubleScale).dividedBy(totalSupplyOfAuToken)
            logger.info(`calculateRewardSupplyIndex > ratio: ${ratio.toString()}`)
            const index = new BigNumber(supplyState['index']).plus(ratio)
            logger.info(`calculateRewardSupplyIndex > new supplyState index: ${index.toString()}`)
            return index
        }
        return new BigNumber(supplyState['index'])
    } catch(e) {
        logger.error(`calculateRewardSupplyIndex > ${e.message}`)
    }
}

const getClaimableSupplyRewards = async(rewardType: number, auTokenAddress: string, userAddress: string) => {
    const rewardSupplyStateIndex = await calculateRewardSupplyIndex(0, auTokenAddress)

    const rewardSupplierIndex = await gUnitroller.callReadMethod('rewardSupplierIndex', 0, auTokenAddress, userAddress)

    const indexDelta = rewardSupplyStateIndex.minus(rewardSupplierIndex);
    logger.info(`delta index: ${indexDelta.toString()}`);

    const auToken = await swissKnife.syncUpTokenDB(auTokenAddress);
    const auTokenHelper = new ContractHelper(auTokenAddress, './Auraro/Aurigami/au.token.json', network);
    const auTokenBalance = await auTokenHelper.callReadMethod('balanceOf', userAddress)
    logger.info(`auToken - ${auToken.symbol} balance: ${auToken.readableAmount(auTokenBalance).toFixed(6)}`)

    const supplierDelta = new BigNumber(auTokenBalance)
                .multipliedBy(indexDelta)
                .dividedBy(DoubleScale)
                .dividedBy(1e18)
    logger.info(`claimable rewards: ${supplierDelta.toNumber().toFixed(6)}`)  
    return supplierDelta;
}

const getClaimableBorrowRewards = async(rewardType: number, auTokenAddress: string, userAddress: string) => {
    const auToken = await swissKnife.syncUpTokenDB(auTokenAddress);
    const auTokenHelper = new ContractHelper(auTokenAddress, './Auraro/Aurigami/au.token.json', network)

    const marketBorrowIndex = new BigNumber(await auTokenHelper.callReadMethod('borrowIndex'))

    logger.info(`marketBorrowIndex > ${marketBorrowIndex}`)
    const borrowDataOfAccount = await auTokenHelper.callReadMethod('getBorrowDataOfAccount', userAddress)
    logger.info(`borrowed auToken - ${auToken.symbol} balance: ${auToken.readableAmount(borrowDataOfAccount[1]).toFixed(6)}`)

    const rewardBorrowStateIndex = await calculateRewardBorrowIndex(0, auTokenAddress, new BigNumber(borrowDataOfAccount[0]), marketBorrowIndex)

    const rewardBorrowerIndex = await gUnitroller.callReadMethod('rewardBorrowerIndex', 0, auTokenAddress, userAddress)

    const indexDelta = rewardBorrowStateIndex.minus(rewardBorrowerIndex);
    logger.info(`delta index: ${indexDelta.toString()}`);

    const borrowerAmount = new BigNumber(borrowDataOfAccount[1]).multipliedBy(ExpScale).dividedBy(marketBorrowIndex)
    logger.info(`borrower amount: ${borrowerAmount.toString()}`) 

    logger.info(borrowerAmount.multipliedBy(indexDelta).toString())
    const borrowerDelta = borrowerAmount.multipliedBy(indexDelta)
                .dividedBy(DoubleScale)
                .dividedBy(1e18)
    logger.info(`claimable borrow rewards: ${borrowerDelta.toString()}`)  
    return borrowerDelta;
}
const main = async () => {
    // const market = await unitroller.callReadMethod('markets', auETHMarket)
    // console.log(market)
    // const memeberShip = await unitroller.callReadMethod('checkMembership', userAddress, auETHMarket)
    // console.log(memeberShip)
    // const assets = await unitroller.callReadMethod('getAssetsIn', userAddress)
    // console.log(assets)
    // const claimableRewards = await unitroller.callReadMethod('rewardAccrued', 0, userAddress)
    // logger.info(`claimable rewards: ${claimableRewards}`)

    // 对于参与多个market，就需要遍历每个market，做同样的计算累加，就可以了
    /**
     * function updateRewardSupplyIndex(uint8 rewardType, address auToken, uint256 totalSupplyOfAuToken) internal virtual{
        checkRewardType(rewardType);
        RewardMarketState storage supplyState = rewardSupplyState[rewardType][auToken];
        uint supplySpeed = rewardSpeeds[rewardType][auToken][true];
        uint deltaTimestamps = block.timestamp - uint(supplyState.timestamp);
        if (deltaTimestamps > 0 && supplySpeed > 0) {
            uint rewardAccrued = deltaTimestamps * supplySpeed;
            Double ratio = totalSupplyOfAuToken > 0 ? fraction(rewardAccrued, totalSupplyOfAuToken) : Double.wrap(0);
            Double index = add_(Double.wrap(supplyState.index), ratio);
            rewardSupplyState[rewardType][auToken] = RewardMarketState({
                index: safe224(Double.unwrap(index)),
                timestamp: uint32(block.timestamp)
            });
        } else if (deltaTimestamps > 0) {
            supplyState.timestamp = uint32(block.timestamp);
        }
    } // 更新index，再读取
     */      
    
    //const reward1 = await getClaimableSupplyRewards(0, auETHMarket, userAddress)
    //const reward2 = await getClaimableSupplyRewards(0, auPLYMarket, userAddress)
    const reward3 = await getClaimableSupplyRewards(0, auUSDC, userAddress)
    console.log('-----------------------------')
    //const reward3 = await getClaimableBorrowRewards(0, auUSDC, userAddress)
    
    // console.log('-----------------------------')
    // const rewardSupply = reward1
    // logger.info(`total supply claimable reward: ${rewardSupply.toNumber().toFixed(6)}`)

    // const rewards = reward1.plus(reward3)
    // logger.info(`total claimable reward: ${rewards.toNumber().toFixed(10)}`)

    
};

main().catch((e) => {
    logger.error(e.message);
});
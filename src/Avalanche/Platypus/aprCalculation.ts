import { BigNumber, constants, utils } from 'ethers'
import { wdiv, wmul, changeDecimal, sqrt } from './DSMath'
import { isParsableString } from './isParsableString'
import { TOKENS } from '../config/contracts/token'
import { TokenSymbol } from '../config/contracts/token/tokenSymbol'

/**
 * @param {BigNumber} ptpPerSecond MasterPlatypus PTP emission per second, in native PTP d.p.
 * @param {BigNumber} poolAllocPoint allocation points assigned to this pool
 * @param {BigNumber} totalAllocPoint  total allocation points to all pool
 * @param {BigNumber} repartition repartition for dialuting or non dialuting emission e.g. 300 means 30%
 * @returns {BigNumber} annual PTP reward of this pool, in WAD
 */
export function getPoolAnnualPtpReward(
  ptpPerSecond: BigNumber,
  poolAllocPoint: BigNumber,
  totalAllocPoint: BigNumber,
  repartition: BigNumber,
): BigNumber {
  if (totalAllocPoint.eq(constants.Zero)) {
    return constants.Zero
  }
  const allPoolsAnnualPtpReward = ptpPerSecond.mul(60).mul(60).mul(24).mul(365)
  const poolAnnualPtpReward = allPoolsAnnualPtpReward
    .mul(poolAllocPoint)
    .div(totalAllocPoint)
  const totalAnnualPtp = poolAnnualPtpReward.mul(repartition).div('1000')

  const wadResult = changeDecimal(
    TOKENS[TokenSymbol.PTP].decimals,
    18,
    totalAnnualPtp,
  )

  return wadResult
}

/**
 * @param {BigNumber} lpAmount in native LP d.p.
 * @param {BigNumber} vePtpBalance in native vePTP d.p.
 * @returns {BigNumber} userfactor native dp same as the MasterPlatypus
 */
export function getUserFactor(
  lpAmount: BigNumber,
  vePtpBalance: BigNumber,
): BigNumber {
  // From SC: user.factor = Math.sqrt(user.amount * vePtp.balanceOf(msg.sender));
  // sqrt(lpAmount (native dp) * vePtpBalance (native dp))
  return sqrt(lpAmount.mul(vePtpBalance))
}

/**
 * Use this function to get the Base APR (passing the dialuting repartition),
 * or the average Boosted APR (passing the non-dialuting repartition),
 * @param {BigNumber} ptpPerSecond MasterPlatypus PTP emission per second, in native PTP d.p.
 * @param {BigNumber} poolAllocPoint allocation points assigned to this pool, in BigNumber Int
 * @param {BigNumber} totalAllocPoint  total allocation points to all pool, in BigNumber Int
 * @param {BigNumber} repartition repartition for dialuting or non dialuting emission e.g. 300 means 30%
 * @param {BigNumber} poolTvlUsd pool TVL in USD, in WAD
 * @param {string} ptpPrice PTP price in USD, in WAD
 * @returns {BigNumber} Pool base APR % in WAD
 */
export function getPoolAprPercent(
  ptpPerSecond: BigNumber,
  poolAllocPoint: BigNumber,
  totalAllocPoint: BigNumber,
  repartition: BigNumber,
  poolTvlUsd: BigNumber,
  ptpPrice: string,
): BigNumber {
  // use 18 d.p because they will be converted to WAD
  if (!isParsableString(ptpPrice, 18)) {
    return BigNumber.from(0)
  }
  if (poolTvlUsd.eq(constants.Zero)) {
    return constants.Zero
  }

  const ptpPriceWAD = utils.parseEther(ptpPrice)
  const ptpAnnualReward = getPoolAnnualPtpReward(
    ptpPerSecond,
    poolAllocPoint,
    totalAllocPoint,
    repartition,
  )

  const annualRewardUsdWAD = wmul(ptpPriceWAD, ptpAnnualReward)
  const apr = wdiv(annualRewardUsdWAD, poolTvlUsd)
  const aprPercent = apr.mul(100)
  return aprPercent
}

/**
 * Get the exact Boosted APR% of an LP, need to know his/her provided LP token amount, and vePTP balance
 * @param {BigNumber} ptpPerSecond MasterPlatypus PTP emission per second, in native PTP d.p.
 * @param {BigNumber} poolAllocPoint allocation points assigned to this pool, in BigNumber Int
 * @param {BigNumber} totalAllocPoint  total allocation points to all pool, in BigNumber Int
 * @param {BigNumber} nonDialutingPoolRepartition repartition for non dialuting emission, in BigNumber Int. e.g. 300 means 30%
 * @param {BigNumber} userTvlUsd user TVL in USD, in WAD
 * @param {string} ptpPrice PTP price in USD, in WAD
 * @param {BigNumber} userFactor MasterPlatypus userInfo's factors
 * @param {BigNumber} poolSumOfFactors MasterPlatypus poolInfo's sumOfFactors
 *
 * @returns {BigNumber} exact Boosted APR% of an LP, in WAD
 */
export function getExactBoostedAprPercent(
  ptpPerSecond: BigNumber,
  poolAllocPoint: BigNumber,
  totalAllocPoint: BigNumber,
  nonDialutingPoolRepartition: BigNumber,
  userTvlUsd: BigNumber,
  ptpPrice: string,
  userFactor: BigNumber, // from MasterPlatypus userInfo's factors
  poolSumOfFactors: BigNumber, // from MasterPlatypus poolInfo's sumOfFactors
): BigNumber {
  // use 18 d.p because they will be converted to WAD
  if (!isParsableString(ptpPrice, 18)) {
    return BigNumber.from(0)
  }
  if (userTvlUsd.eq(constants.Zero) || poolSumOfFactors.eq(constants.Zero)) {
    return constants.Zero
  }
  const ptpPriceWAD = utils.parseEther(ptpPrice)
  const ptpAnnualReward = getPoolAnnualPtpReward(
    ptpPerSecond,
    poolAllocPoint,
    totalAllocPoint,
    nonDialutingPoolRepartition,
  )

  const poolAnnualRewardUsdWAD = wmul(ptpPriceWAD, ptpAnnualReward)
  const userAnnualRewardUsdWAD = poolAnnualRewardUsdWAD
    .mul(userFactor)
    .div(poolSumOfFactors)

  const apr = wdiv(userAnnualRewardUsdWAD, userTvlUsd)
  const aprPercent = apr.mul(100)
  return aprPercent
}

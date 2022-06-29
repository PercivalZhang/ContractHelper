import { getTimestampsForChanges, getBlocksFromTimestamps, get2DayPercentChange, getPercentChange } from "./utils";
import { client } from './apollo/client'
import { PAIRS_BULK, PAIRS_HISTORICAL_BULK, PAIR_DATA, USER_POSITIONS } from './apollo/query'

async function getUserPositions(userAddress: string) {
    try {
        let positions = await client.query({
            query: USER_POSITIONS,
            variables: {
                user: userAddress,
            },
            fetchPolicy: 'cache-first',
        })
        console.log(JSON.stringify(positions))
    } catch (e) {
        //console.log(e)
    }
}
async function getBulkPairData(pairList, ethPrice) {
    const [t1, t2, tWeek] = getTimestampsForChanges()
    let [{ number: b1 }, { number: b2 }, { number: bWeek }] = await getBlocksFromTimestamps([t1, t2, tWeek])
    try {
        let current = await client.query({
            query: PAIRS_BULK,
            variables: {
                allPairs: pairList,
            },
            fetchPolicy: 'cache-first',
        })
        let [oneDayResult, twoDayResult, oneWeekResult] = await Promise.all(
            [b1, b2, bWeek].map(async (block) => {
                let result = client.query({
                    query: PAIRS_HISTORICAL_BULK(block, pairList),
                    fetchPolicy: 'cache-first',
                })
                return result
            })
        )
        let oneDayData = oneDayResult?.data?.pairs.reduce((obj, cur, i) => {
            return { ...obj, [cur.id]: cur }
        }, {})

        let twoDayData = twoDayResult?.data?.pairs.reduce((obj, cur, i) => {
            return { ...obj, [cur.id]: cur }
        }, {})

        let oneWeekData = oneWeekResult?.data?.pairs.reduce((obj, cur, i) => {
            return { ...obj, [cur.id]: cur }
        }, {})

        let pairData = await Promise.all(
            current &&
            current.data.pairs.map(async (pair) => {
                let data = pair
                let oneDayHistory = oneDayData?.[pair.id]
                if (!oneDayHistory) {
                    let newData = await client.query({
                        query: PAIR_DATA(pair.id, b1),
                        fetchPolicy: 'cache-first',
                    })
                    oneDayHistory = newData.data.pairs[0]
                }
                let twoDayHistory = twoDayData?.[pair.id]
                if (!twoDayHistory) {
                    let newData = await client.query({
                        query: PAIR_DATA(pair.id, b2),
                        fetchPolicy: 'cache-first',
                    })
                    twoDayHistory = newData.data.pairs[0]
                }
                let oneWeekHistory = oneWeekData?.[pair.id]
                if (!oneWeekHistory) {
                    let newData = await client.query({
                        query: PAIR_DATA(pair.id, bWeek),
                        fetchPolicy: 'cache-first',
                    })
                    oneWeekHistory = newData.data.pairs[0]
                }
                data = parseData(data, oneDayHistory, twoDayHistory, oneWeekHistory, ethPrice, b1)
                return data
            })
        )
        return pairData
    } catch (e) {
        //console.log(e)
    }
}

function parseData(data, oneDayData, twoDayData, oneWeekData, ethPrice, oneDayBlock) {
    // get volume changes
    const [oneDayVolumeUSD, volumeChangeUSD] = get2DayPercentChange(
        data?.volumeUSD,
        oneDayData?.volumeUSD ? oneDayData.volumeUSD : 0,
        twoDayData?.volumeUSD ? twoDayData.volumeUSD : 0
    )
    const [oneDayVolumeUntracked, volumeChangeUntracked] = get2DayPercentChange(
        data?.untrackedVolumeUSD,
        oneDayData?.untrackedVolumeUSD ? parseFloat(oneDayData?.untrackedVolumeUSD) : 0,
        twoDayData?.untrackedVolumeUSD ? twoDayData?.untrackedVolumeUSD : 0
    )
    const oneWeekVolumeUSD = parseFloat(oneWeekData ? data?.volumeUSD - oneWeekData?.volumeUSD : data.volumeUSD)

    // set volume properties
    data.oneDayVolumeUSD = oneDayVolumeUSD
    data.oneWeekVolumeUSD = oneWeekVolumeUSD
    data.volumeChangeUSD = volumeChangeUSD
    data.oneDayVolumeUntracked = oneDayVolumeUntracked
    data.volumeChangeUntracked = volumeChangeUntracked

    // set liquiditry properties
    data.trackedReserveUSD = data.trackedReserveETH * ethPrice
    data.liquidityChangeUSD = getPercentChange(data.reserveUSD, oneDayData?.reserveUSD)

    // format if pair hasnt existed for a day or a week
    if (!oneDayData && data && data.createdAtBlockNumber > oneDayBlock) {
        data.oneDayVolumeUSD = parseFloat(data.volumeUSD)
    }
    if (!oneDayData && data) {
        data.oneDayVolumeUSD = parseFloat(data.volumeUSD)
    }
    if (!oneWeekData && data) {
        data.oneWeekVolumeUSD = parseFloat(data.volumeUSD)
    }

    // format incorrect names
    //updateNameData(data)

    return data
}

const main = async () => {
    // const timestamps = getTimestampsForChanges()
    // console.log(timestamps)
    // const [t1, t2, tWeek] = getTimestampsForChanges()
    // const blocks = await getBlocksFromTimestamps([t1, t2, tWeek])
    // console.log(blocks)


    //0x20e66bc8f35aa9573cc5c308f10dbead9e617a69 - cube/corn
    //0x42d0efc74a084fe0cc5e82c6f22667db72ed823f - usdc/usdt
    const data = await getBulkPairData(['0x20e66bc8f35aa9573cc5c308f10dbead9e617a69'], 1094)
    console.log(data)

    //await getUserPositions('0xdb6045b87471b3398329c384f61f66958c238c83')
};

main().catch((e) => {
    console.error(e.message);
});
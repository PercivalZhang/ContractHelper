import { NetworkType } from '../../library/web3.factory'; 
export const Config = {
    network: NetworkType.AVALANCHE,
    //LP挖矿
    farmChef: {
        // address: '0xb0523f9f473812fb195ee49bc7d2ab9873a98044',
        address: '0x68c5f4374228beedfa078e77b5ed93c28a2f713e',
        methods: {
            poolLength: 'poolLength',
            userInfo: 'userInfo',
            poolInfo: 'poolInfo',
            pendingReward: 'pendingTokens',
            rewardToken: 'ptp',
            totalAllocPoint: 'totalAdjustedAllocPoint',
        },
        pool: {
            lpToken: 'lpToken',
            allocPoint: 'adjustedAllocPoint',
        },
    },
    ptp: '0x22d4002028f537599be9f666d1c4fa138522f9c8',
    ptpPrice: 4.75,
    poolManager: '0x66357dcace80431aee0a7507e2e361b7e2402370',
    priceOracle: '0x7b52f4b5c476e7afd09266c35274737cd0af746b'
};

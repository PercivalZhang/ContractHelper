export enum PoolCategory {
    Base = 0,
    Meta = 1,
    Lending = 1,
}
export const Config = {
    crv: '0xD533a949740bb3306d119CC777fa900bA034cd52',
    stableCoin: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    gaugeController: '0x2f50d538606fa9edd2b11e2446beb18c9d5846bb',
    pools: {
        '0x92215849c439e1f8612b6646060b4e3e5ef822cc': {
            // pool: atricrypto3
            version: 1,
            pType: PoolCategory.Meta,
            coinSize: 3,
            coinPriceMap: new Map([
                [1, 0],
                [2, 1],
            ]),
            gauge: {
                address: '0x3B6B158A76fd8ccc297538F454ce7B4787778c7C',
                rewardManager: '0x060e386eCfBacf42Aa72171Af9EFe17b3993fC4F',
            },
        },
        '0x445fe580ef8d70ff569ab36e80c647af338db351': {
            // pool: aave 3CRV(usdt/usdc/dai)
            pType: PoolCategory.Lending,
            coinSize: 3,
            gauge: {
                address: '0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c',
                rewardManager: '0x060e386eCfBacf42Aa72171Af9EFe17b3993fC4F',
            },
        },
    },
};

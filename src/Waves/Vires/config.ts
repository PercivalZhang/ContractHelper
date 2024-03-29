export const Config = {
    nodeURI: 'https://nodes.wavesnodes.com/', //节点URL
    main: '3PAZv9tgK1PX7dKR7b4kchq5qdpUS3G5sYT', //main合约(入口合约)   
    limit: '3PRBVq52csUvTx77NYwLTULrt2e9jdsHfRB', //借款，取款额度限制合约  
    config: '3P2rJGfb5MbeivZNSqdVmsD1Y2Mz8y6Jr3Z', //config配置管理合约
    boost: '3PFraDBNUFry9mgcfMo3hGcr3dm43TuYmN6', //固定锁仓(3/6/12)质押
    vaults: { //金库合约信息
        usdc: '3PGCkrHBxFMi7tz1xqnxgBpeNvn5E4M4g8S',
        usdt: '3PEiD1zJWTMZNWSCyzhvBw9pxxAWeEwaghR', 
        waves: '3P8G747fnB1DTQ4d5uD114vjAaeezCW4FaM',
        usdn: '3PCwFXSq8vj8iKitA5zrrLRbuqehfmimpce',
        eur: '3PBjqiMwwag72VWUtHNnVrxTBrNK8D7bVcN',
    },
    Vires: { //平台币信息
        address: 'DSbbhLsSTeDg5Lsiufk2Aneh3DjVqJuPr2M9uU1gwy5p',
        symbol: 'VIRES',
        decimals: 8
    },
    KeyOfPriceMap: { //资产Id与预言机价格Key的映射关系
        '8LQW8f7P5d5PZM7GtZEBgaqRPGSzS3DfPuiXrURJ4AJS': '%s%s__price__BTC-USDT', //btc
        '474jTeYx2r2Va35794tCScAXWJG9hU2HcgxzMowaZUnu': '%s%s__price__ETH-USDT', //eth
        'DUk2YTxhRoAqMJLus4G2b3fR8hMHVh6eiyFx5r29VR6t': '%s%s__price__EUR', //usdn
        WAVES: '%s%s__price__WAVES-USDT', //WAVES
    },
    oracle: '3PKkojKdd6BBzTf1RXbQVfUDraNFXXHKzQF', //稳定币等的预言机
    eurOracle: '3P8qJyxUqizCWWtEn2zsLZVPzZAjdNGppB1', //EUR币的单独预言机
    swopfiPair: '3PJ48P3p2wvWUjgQaQiZ2cFbr8qmxMokBGd', //查询Vires的价格
    rewardDistributor: '3P2RkFDTHJCB82HcVvJNU2eMEfUo82ZFagV' //奖励分发智能账户
};
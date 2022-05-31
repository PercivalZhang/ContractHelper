waves

官方 API
获取账号状态
https://api.vires.finance/user/3PBYybAKc9M9hsFE47S8pxdg9obJJsVotAs
用户参与的所有市场的信息：
···
{
"3P8G747fnB1DTQ4d5uD114vjAaeezCW4FaM": {
"borrow": "0",
"supply": "0",
"protectedSupply": "0",
"vTokenContractBalance": "0",
"useAsCollateral": true,
"rewardsAccumulated": "0",
"rewardsClaimed": "0",
"rewardsAvailable": "0"
},
"3PA7QMFyHMtHeP66SUQnwCgwKQHKpCyXWwd": {
"borrow": "0",
"supply": "0",
"protectedSupply": "0",
"vTokenContractBalance": "0",
"useAsCollateral": true,
"rewardsAccumulated": "0",
"rewardsClaimed": "0",
"rewardsAvailable": "0"
},
"3PBjqiMwwag72VWUtHNnVrxTBrNK8D7bVcN": {
"borrow": "0",
"supply": "0",
"protectedSupply": "0",
"vTokenContractBalance": "0",
"useAsCollateral": true,
"rewardsAccumulated": "0",
"rewardsClaimed": "0",
"rewardsAvailable": "0"
},
"3PCwFXSq8vj8iKitA5zrrLRbuqehfmimpce": {
"borrow": "0",
"supply": "0",
"protectedSupply": "0",
"vTokenContractBalance": "0",
"useAsCollateral": true,
"rewardsAccumulated": "0",
"rewardsClaimed": "0",
"rewardsAvailable": "0"
},
"3PEiD1zJWTMZNWSCyzhvBw9pxxAWeEwaghR": {
"borrow": "0",
"supply": "2000055",
"protectedSupply": "0",
"vTokenContractBalance": "1732667",
"useAsCollateral": true,
"rewardsAccumulated": "5",
"rewardsClaimed": "0",
"rewardsAvailable": "5"
},
"3PGCkrHBxFMi7tz1xqnxgBpeNvn5E4M4g8S": {
"borrow": "0",
"supply": "0",
"protectedSupply": "0",
"vTokenContractBalance": "0",
"useAsCollateral": true,
"rewardsAccumulated": "0",
"rewardsClaimed": "0",
"rewardsAvailable": "0"
},
"3PPdeWwrzaxqgr6BuReoF3sWfxW8SYv743D": {
"borrow": "0",
"supply": "0",
"protectedSupply": "0",
"vTokenContractBalance": "0",
"useAsCollateral": true,
"rewardsAccumulated": "0",
"rewardsClaimed": "0",
"rewardsAvailable": "0"
}
}
···

入口 smart 账户的脚本：https://wavesexplorer.com/address/3PAZv9tgK1PX7dKR7b4kchq5qdpUS3G5sYT/script

关键方法 - 存款：func doDeposit (i,reserve,useAsCollateral)
｜
调用了 Reserve 智能账户的脚本： invoke(validateReserve(reserve), "depositFor", [user, useAsCollateral], i.payments）

Reserv - USDT 智能账户：
https://wavesexplorer.com/address/3PEiD1zJWTMZNWSCyzhvBw9pxxAWeEwaghR/script

关键方法存款：func depositFor (depositor,useAsCollateral)
交易：https://wavesexplorer.com/tx/DueJ2HSZCB1nT5N8aBWw5UxaFz8K62Ps8AH5XGbQmbcy

每个Reserve都会关联一个全局的配置智能账户 - Reserve池的各种配置信息
https://wavesexplorer.com/address/3PJ1kc4EAPL6fxuz3UZL68LPz1G9u4ptjYT/data

挖矿奖励
在配置账户的Data中有一个key - vires_distributor 定义了平台币vires的奖励计算和分发的智能账户


平台币vires的奖励计算和分发的智能账户
https://wavesexplorer.com/address/3P2RkFDTHJCB82HcVvJNU2eMEfUo82ZFagV/script
关键方法：func userRewardBalance (reserve,user) 

价格预言机
https://wavesexplorer.com/address/3PFHm5TYKw4vVzj4rW8s3Yso88aD73Dai1C/script
```
func getViresPrice () = {
    let swopfiPair = addressFromStringValue("3PJ48P3p2wvWUjgQaQiZ2cFbr8qmxMokBGd")
    let keyBalanceA = "A_asset_balance"
    let keyBalanceB = "B_asset_balance"
    let balanceA = getIntegerValue(swopfiPair, keyBalanceA)
    let balanceB = getIntegerValue(swopfiPair, keyBalanceB)
    fraction(balanceB, (100 * dollar), balanceA)
    }
```



lock

https://new.wavesexplorer.com/addresses/3PFraDBNUFry9mgcfMo3hGcr3dm43TuYmN6

locked balance:
key: [user address] + '_' + [vires lp token address] + '_amt'

unlock height:
key: [user address] + '_' + [vires lp token address] + '_unlockHeight'

weightFactor
key: [user address] + '_' + [vires lp token address] + '_weightFactor'

weight
key: [user address] + '_' + [vires lp token address] + '_weight'
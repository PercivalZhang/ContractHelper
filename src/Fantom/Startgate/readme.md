# DOC

# Stargate BSC

## 用户资产统计
涉及合约 - LP Staking Chef合约
- 获取用户质押余额: userInfo(uint _pid, address userAddress)
- 获取用户可领取奖励: pendingStargate(uint _pid, address userAddress)

## LP池子资产统计
涉及合约 - LP Pool合约
> 两种方法获取LP Pool合约地址: 通过Factory工厂合约遍历获取 / 通过LP Staking Chef合约遍历获取

- 获取LP池子TVL：totalLiquidity()

## 关键合约
### 1. Router合约
https://bscscan.com/address/0x4a364f8c717cAAD9A442737Eb7b8A55cc6cf18D8#code

#### 1.1 合约方法
添加流动性
- addLiquidity(uint256 _poolId, uint256 _amountLD, address _to)
示范交易：https://bscscan.com/tx/0x194dacc53302d92f5fb84f1a9f63441aa2e50e8049d05b663a6b6a90be18f805

移除流动性
- instantRedeemLocal(uint256 _poolId, uint256 _amountLD, address _to)
示范交易：https://bscscan.com/tx/0x5783eda66b6906ecdb6c9078c270eb1038cc8451df4f6e74c2ed2985b3744137

### 2. Factory合约 - Pool管理
https://bscscan.com/address/0xe7ec689f432f29383f217e36e680b5c855051f25#readContract

#### 2.1 合约方法
获取LP池子的数量
- allPoolsLength()

获取目标LP池子信息
- getPool(uint _pid)
> pid=0的池子可能只是占位，实际池子pid往下顺沿, BSC链上的两个LP池子，实际pid是 2 和 5

### 3. LP Pool合约
Tether USD-LP (S*USDT) : https://bscscan.com/token/0x9aa83081aa06af7208dcc7a4cb72c94d057d2cda#readContract
BUSD Token-LP (S*BUSD) :  https://bscscan.com/address/0x98a5737749490856b401DB5Dc27F522fC314A4e1

### #3.1 合约方法
获取可用流动性余额（TVL）
- totalLiquidity()

获取LP池子Id
- poolId()

获取LP Token余额
- balanceOf()
eg. 获取质押合约质押的LP Token数目：balanceOf(质押合约地址)


### 4. LP Staking Chef合约
https://bscscan.com/address/0x3052A0F6ab15b4AE1df39962d5DdEFacA86DaB47#code

#### 4.1 合约方法
获取池子数目
- poolLength()

获取池子详情
- poolInfo(uint _pid)
返回数据范例：
```
  lpToken   address :  0x9aA83081AA06AF7208Dcc7A4cB72C94d057D2cda //LP Token/Pool地址
  allocPoint   uint256 :  50
  lastRewardBlock   uint256 :  16588087
  accStargatePerShare   uint256 :  62674351482918839991526
```

获取待领取奖励
- pendingStargate(uint _pid, address userAddress)

获取用户质押LP Token余额
- userInfo(uint _pid, address userAddress)

获取奖励总份额数量
- totalAllocPoint()

获取奖励释放速率
- stargatePerBlock()

质押LP到目标池子
- deposit(uint _pid, uint _amount)
示范交易：https://bscscan.com/tx/0x212afc5dff6d3cd811e3725da0d7bc789e08bc4ada1a3963cb0a37531901c45c

领取待领取的奖励
- deposit(uint _pid, uint _amount)
示范交易：https://bscscan.com/tx/0x1cc8c162c6483f8febc190a3e3a76a317c2fe5b7fc47a2de03ed2e056ce47d30
> 其实就是将数量设定为0，就可以通过质押接口只领取奖励

从目标池子撤回质押的LP
- withdraw(uint _pid, uint _amount)
示范交易：https://bscscan.com/tx/0x3ebb18b9e87b952218d61390673f2f31a79044b9a6f699516f7516aa0890def8



# Stargate ETH
## Router合约
https://etherscan.io/address/0x8731d54E9D02c286767d56ac03e8037C07e01e98#code

## Factory合约
https://etherscan.io/address/0x06d538690af257da524f25d0cd52fd85b1c2173e#readContract

## LP合约
USD Coin-LP (S*USDC)   : https://etherscan.io/address/0xdf0770dF86a8034b3EFEf0A1Bb3c889B8332FF56#readContract
Tether USD-LP (S*USDT) : https://etherscan.io/address/0x38EA452219524Bb87e18dE1C24D3bB59510BD783

## LP Staking Chef合约
https://etherscan.io/address/0xB0D502E938ed5f4df2E681fE6E419ff29631d62b#readContract


# Stargate Arbitrium
## Router合约
https://arbiscan.io/address/0x53bf833a5d6c4dda888f69c22c88c9f356a41614#code

## Factory合约
https://arbiscan.io/address/0x55bdb4164d28fbaf0898e0ef14a589ac09ac9970#readContract

## LP Staking Chef合约
https://arbiscan.io/address/0xea8dfee1898a7e0a59f7527f076106d7e44c2176#code


# Stargate Polygon
## Router合约
https://polygonscan.com/address/0x45a01e4e04f14f7a4a6702c74187c5f6222033cd#readContract

## Factory合约
https://polygonscan.com/address/0x808d7c71ad2ba3fa531b068a2417c63106bc0949#readContract

## LP合约
...

## LP Staking Chef合约
https://polygonscan.com/address/0x8731d54e9d02c286767d56ac03e8037c07e01e98#readContract




# Stargate Fantom
## Router合约
https://ftmscan.com/address/0xaf5191b0de278c7286d6c7cc6ab6bb8a73ba2cd6#code

addLiquidity

## Factory合约
https://ftmscan.com/address/0x9d1b1669c73b033dfe47ae5a0164ab96df25b944#readContract

管理pool

## LP Staking Chef合约
https://ftmscan.com/address/0x224D8Fd7aB6AD4c6eb4611Ce56EF35Dec2277F03#readContract


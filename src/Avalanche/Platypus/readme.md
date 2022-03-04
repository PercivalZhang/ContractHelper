# Manual

## 合约操作手册
### 1. 挖矿合约(Proxy) [0xB0523f9F473812FB195Ee49BC7d2ab9873a98044](https://snowtrace.io//address/0xB0523f9F473812FB195Ee49BC7d2ab9873a98044#readProxyContract)

> 实现合约Code&ABI: [0x28a4e13f4186da18f54a66b952f2abc12611f87a](https://snowtrace.io/address/0x28a4e13f4186da18f54a66b952f2abc12611f87a#code)

#### 1.1 获取用户质押LPToken的数量
- 方法名：userInfo
- 参数说明
```
_pid : 池子编号 uint256
_userAddress : 目标用户地址 address
```
- 返回数据
```
amount   uint256 :  999999 //质押LPToken的数量
rewardDebt   uint256 :  306627909797368967
factor   uint256 :  2066953417151
```
#### 1.2 退出LP质押
- 方法名: withdraw
- 参数说明
```
_pid: 池子编号 uint256
_amount: LPToken的数量 uint256
```
#### 1.3 质押池列表
| 池子名称 | 池子编号 | LPToken地址 | 资产Token地址 |
| :-----| :----: | :----: | :----:|
| USDT.e | 0 | 0x0D26D103c91F63052Fbca88aAF01d5304Ae40015 | 0xc7198437980c041c805a1edcba50c1ce5db95118 |
| USDC.e | 1 | 0x909B0ce4FaC1A0dCa78F8Ca7430bBAfeEcA12871 | 0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664 |
| DAI.e | 2 | 0xc1Daa16E6979C2D1229cB1fd0823491eA44555Be | 0xd586e7f844cea2f87f50152665bcbc2c279d8d70 |
| USDC | 4 | 0xAEf735B1E7EcfAf8209ea46610585817Dc0a2E16 | 0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e |
| USDT | 5 | 0x776628A5C37335608DD2a9538807b9bba3869E14 | 0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7 |

### 2. Pool管理合约(Proxy) [0x66357dcace80431aee0a7507e2e361b7e2402370](https://snowtrace.io//address/0x66357dcace80431aee0a7507e2e361b7e2402370#readProxyContract)

> 实现合约Code&ABI [0xe2d3eb21db91f6a8dde5dac9fde7f546aa7590ba](https://snowtrace.io/address/0xe2d3eb21db91f6a8dde5dac9fde7f546aa7590ba#code)

#### 2.1 取回存款
- 方法名: withdraw
- 参数说明
```
address: 资产token地址 address
liquidity: 要撤回LPToken数量 uint256
minimumAmount: 用户可接受的最小LPToken数量 uint256
to: 用户收款地址 address
deadline: 截止日期 uint256
```
参考交易(参考Input Data部分的函数调用): [0x189b1851e120e93b339f608dba37b77fa17fcc0b2b2eaba75de7a6a2022633af](https://snowtrace.io/tx/0x189b1851e120e93b339f608dba37b77fa17fcc0b2b2eaba75de7a6a2022633af)

> 备注：可能需要授权该合约操作目标LPToken

### 3. vePTP合约(Proxy) [0x5857019c749147EEE22b1Fe63500F237F3c1B692](https://snowtrace.io//address/0x5857019c749147EEE22b1Fe63500F237F3c1B692#readProxyContract)

> 实现合约Code&ABI [0x0104ec62afc47af38ce214568927287e4bfdc773](https://snowtrace.io/address/0x0104ec62afc47af38ce214568927287e4bfdc773#code)

#### 3.1 取回质押的PTP
- 方法名: withdraw
- 参数说明
```
_amount: 要取回的PTP的数量 uint256
```
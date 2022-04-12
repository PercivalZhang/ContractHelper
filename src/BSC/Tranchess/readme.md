# exchangeV2 合约
https://bscscan.com/address/0x42867df3c1ce62613aae3f4238cbcf3d7630880b#readProxyContract
## 方法列表
### 存款：Function: deposit(uint256 _pid, uint256 _amount) 
eg. https://bscscan.com/tx/0xe5bec928832b01be15a9597561d25bd6a8fe1a5d851af28147ad809cab05dfb6
### 取回： function withdraw(uint256 tranche, uint256 amount) 
eg：https://bscscan.com/tx/0x8c447c4b7c2257da4142c3da3e8065a10b42ad9b3d77df45f1f4c6501f0d105d
### 领取奖励： function claimableRewards(address account)


# BatchOperationHelper合约
https://bscscan.com/address/0xa6fd871d96f4e612b2ed7655f3fb78d9672815a1#code
## 方法列表
### 领取所有Fund的奖励：Function: batchClaimRewards(address[] contracts, address account) 
eg. https://bscscan.com/tx/0x68f2f7b5b6f1db42122e5ac008d7342168ff30c21ff39125732e39092732dd3c
> 调用contracts中的每个exchange的方法claimableRewards，领取奖励

# Voting Escow合约
https://bscscan.com/address/0x95a2bbcd64e2859d40e2ad1b5ba49dc0e1abc6c2#readProxyContract

## 方法列表
### 锁定chess：Function: createLock(uint256 amount, uint256 end)
eg. https://bscscan.com/tx/0xa4405c0516378d0482dd9c8dfbd280cb7e48a16a0ca26ca450ec1b8d29624c88
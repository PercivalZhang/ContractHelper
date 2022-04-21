# APR on Deposit

具体细节参见官方文档：https://docs.tokemak.xyz/toke/liquidity-direction/system-level-reward-logic-and-equations

## 奖励token - TOKE的释放速率
- 5600 TOKE per day for LPs in token reactors (project tokens)
- 2820 TOKE per day for LPs in pair reactors (stables and ETH)
- 4900 TOKE per day for LDs

## 公式
以ETH Pool为例，该池子属于Pair reactors。

奖励占比 = 池子TVL在Pair reactors所有池子TVL总和中的占比的2/3次方 * 池子投票Toke在Pair reactors所有池子投票中的占比的1/3次方

奖励token数目 = 奖励占比 * 总奖励

其中总奖励 = 奖励token释放速率 * Duration（一个cycle是一周）


# APR on Vote

具体细节参见官方文档中的LD部分：https://docs.tokemak.xyz/toke/liquidity-direction/system-level-reward-logic-and-equations

## Vote Tacker合约
https://polygonscan.com/address/0x7A9A3395afB32F923a142dBC56467Ae5675Ce5ec#readProxyContract

调用方法getSystemVotes获取所有reactor的投票，以及投票总数

# Toke质押合约
https://etherscan.io/address/0x96f98ed74639689c3a11daf38ef86e59f43417d3#readProxyContract


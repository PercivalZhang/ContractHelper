/**
 * Bank: 负责存款/借款
 * - contract: https://etherscan.io/address/0xde7b3b2fe0e7b4925107615a5b199a4eb40d9ca9#readProxyContract
 * fToken： 存款凭证token，负责记账
 * - fHFIL：https://etherscan.io/token/0x9B0a69FD9858f294029cb76545106b1BD42e0eDA#readProxyContract
 * - totalCash(): 获取可用存款余额 - HFil的数量
 * - totalBorrows(): 获取出借额度 - HFil数量
 * - calculateBalanceOfUnderlying(_user): 计算用户underlying token - FIL的数量
 * */

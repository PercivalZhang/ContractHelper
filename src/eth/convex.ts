/**
 * Booster合约： https://etherscan.io/address/0xf403c135812408bfbe8713b5a23a04b3d48aae31#code
 * - Methods方法：
 * -- poolInfo(_pid): pid = 38
 *      lptoken   address :  0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c // Curve LP Token地址
        token   address :  0xCA3D9F45FfA69ED454E66539298709cb2dB8cA61   // 存款凭证token： 1:1
        gauge   address :  0x9582C4ADACB3BCE56Fea3e590F05c3ca2fb9C477
        crvRewards   address :  0x02E2151D4F351881017ABdF2DD2b51150841d5B3 // CRV奖励合约
        stash   address :  0x521e6EEfDa35f7228f8f83462552bDB41D64d86B
        shutdown   bool :  false
 * 
 * CRV奖励合约：Convex平台上每一个curve LPT都有一个对应的该合约    
 * - Methods方法：
 * -- balanceOf(_userAddress): 获取用户质押凭证token数量
 * -- earned(_userAddress): 获取用户可领取的CRV token数量
 * 
 * CVX奖励计算：CVX合约： https://etherscan.io/address/0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b#code
 * - mint(address, amount)
 * -- 参考如下代码，_amount 初始值 = CRV奖励数量
 *      // use current supply to gauge cliff
        //this will cause a bit of overflow into the next cliff range
        //but should be within reasonable levels.
        //requires a max supply check though
        uint256 cliff = supply.div(reductionPerCliff);
        //mint if below total cliffs
        if(cliff < totalCliffs){
            //for reduction% take inverse of current cliff
            uint256 reduction = totalCliffs.sub(cliff);
            //reduce
            _amount = _amount.mul(reduction).div(totalCliffs);

            //supply cap check
            uint256 amtTillMax = maxSupply.sub(supply);
            if(_amount > amtTillMax){
                _amount = amtTillMax;
            }

           return _amount;
        }        
 */
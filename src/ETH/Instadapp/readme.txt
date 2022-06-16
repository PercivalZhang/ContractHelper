# 获得vault列表及其详情
https://api.instadapp.io/v2/mainnet/lite/users/0x881897b1FC551240bA6e2CAbC7E59034Af58428a/vaults

# 获得vault存款/待领取收益
https://api.instadapp.io/v2/mainnet/lite/users/0x881897b1FC551240bA6e2CAbC7E59034Af58428a/vaults/0xc8871267e07408b89aA5aEcc58AdCA5E574557F8/stats


# LiDO Staking 合约
https://etherscan.io/token/0xae7ab96520de3a18e5e111b5eaab095312d7fe84?a=0x94269a09c5fcbd5e88f9df13741997bc11735a9c


# instadapp account -InstaAccountV2
https://etherscan.io/address/0x94269a09c5fcbd5e88f9df13741997bc11735a9c#code


# InstaDeleverageAndWithdrawWrapper
https://etherscan.io/address/0xa6978cba39f86491ae5dca53f4cdefcb100e3e3d#code

method - deleverageAndWithdraw



```
if (!web3 || !dsa) {
  return alert('Not connected!')
}

console.log('Connected address', USER_ADDRESS)

const dsaWallets = await dsa.getAccounts(USER_ADDRESS)
// If you don't have a Instadapp DeFi Smart Account
if (dsaWallets.length == 0) return alert("Create a DSA")

const stethAddr = '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84'
const ethAddr = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
const wethAddr = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const ethVaultAddr = '0xc383a3833a87009fd9597f8184979af5edfad019'
const ethVaultDsaAddr = '0x94269A09c5Fcbd5e88F9DF13741997bc11735a9c'
const wethContract = new web3.eth.Contract(erc20ABI, wethAddr)
let ethVaultWethBalance = await wethContract.methods.balanceOf(ethVaultAddr).call()
let ethVaultDsaWethWethBalance = await wethContract.methods.balanceOf(ethVaultDsaAddr).call()
let ethAvailable = new BigNumber(ethVaultWethBalance).plus(new BigNumber(ethVaultDsaWethWethBalance))
if (ethAvailable.isLessThan(10 ** 9)) ethAvailable = new BigNumber(0)

let spells = dsa.Spell()
const {
  data: vaultsData
} = await axios.get(`https://api.instadapp.io/v2/mainnet/lite/users/${dsa.instance.address}/vaults`)

// All the vaults having zero deleverage amount will be in the beginning as they add collateral
const migrationData = []
for (let i = 0; i < vaultsData.length; i++) {
  if (vaultsData[i].userSupplyAmount != '0') {
    const {
      data: deleverageData
    } = await axios.get(`https://api.instadapp.io/v2/mainnet/lite/vaults/${vaultsData[i].vault}/withdrawAmts/${new BigNumber(vaultsData[i].userSupplyAmount).times(new BigNumber(10 ** vaultsData[i].decimals)).toFixed(0)}`)
    migrationData.push({
      "vault": vaultsData[i].vault,
      "token": vaultsData[i].tokenAddress,
      "decimals": vaultsData[i].decimals,
      "withdrawAmt": vaultsData[i].userSupplyAmount,
      "deleverageAmt": deleverageData.deleverageAmt
    })
  }
}
migrationData.sort((a, b) => new BigNumber(a.deleverageAmt).minus(new BigNumber(b.deleverageAmt)).toNumber())
let maxPos = migrationData.length - 1
const flashFactor = "1.5"
let flashAmt
if (migrationData[maxPos].deleverageAmt != '0') {
  flashAmt = new BigNumber(migrationData[maxPos].deleverageAmt).times(new BigNumber(flashFactor)).toFixed(0)
  spells.add({
    connector: "AAVE-V2-A",
    method: "deposit",
    args: [wethAddr, flashAmt, "0", "0"]
  });
}

for (let i = 0; i < migrationData.length; i++) {
  if (migrationData[i].deleverageAmt == '0') {
    spells.add({
      connector: "LITE-A",
      method: "withdraw",
      args: [migrationData[i].vault, migrationData[i].withdrawAmt, "0", "0"]
    });
    if (migrationData[i].vault.toLowerCase() == ethVaultAddr.toLowerCase()) {
      if (ethAvailable.isZero()) {
        spells.add({
          connector: "AAVE-V2-A",
          method: "deposit",
          args: [stethAddr, dsa.maxValue, "0", "0"]
        });
      } else if (ethAvailable.isGreaterThanOrEqualTo(new BigNumber(migrationData[i].withdrawAmt))) {
        spells.add({
          connector: "AAVE-V2-A",
          method: "deposit",
          args: [ethAddr, dsa.maxValue, "0", "0"]
        });
      } else {
        spells.add({
          connector: "AAVE-V2-A",
          method: "deposit",
          args: [stethAddr, dsa.maxValue, "0", "0"]
        });
        spells.add({
          connector: "AAVE-V2-A",
          method: "deposit",
          args: [ethAddr, dsa.maxValue, "0", "0"]
        });
      }
    } else {
      spells.add({
        connector: "AAVE-V2-A",
        method: "deposit",
        args: [migrationData[i].token, dsa.maxValue, "0", "0"]
      });
    }
  } else {
    spells.add({
      connector: "AAVE-V2-A",
      method: "borrow",
      args: [wethAddr, migrationData[i].deleverageAmt, "2", "0", "0"]
    });
    spells.add({
      connector: "LITE-A",
      method: "deleverageAndWithdraw",
      args: [
        migrationData[i].vault,
        migrationData[i].deleverageAmt,
        new BigNumber(migrationData[i].withdrawAmt)
          .times(new BigNumber(10 ** migrationData[i].decimals))
          .times(0.9999)
          .toFixed(0),
        [],
        []
      ]
    });
    if (migrationData[i].vault.toLowerCase() == ethVaultAddr.toLowerCase()) {
      if (ethAvailable.isZero()) {
        spells.add({
          connector: "AAVE-V2-A",
          method: "deposit",
          args: [stethAddr, dsa.maxValue, "0", "0"]
        });
      } else if (ethAvailable.isGreaterThanOrEqualTo(new BigNumber(migrationData[i].withdrawAmt))) {
        spells.add({
          connector: "AAVE-V2-A",
          method: "deposit",
          args: [ethAddr, dsa.maxValue, "0", "0"]
        });
      } else {
        spells.add({
          connector: "AAVE-V2-A",
          method: "deposit",
          args: [stethAddr, dsa.maxValue, "0", "0"]
        });
        spells.add({
          connector: "AAVE-V2-A",
          method: "deposit",
          args: [ethAddr, dsa.maxValue, "0", "0"]
        });
      }
    } else {
      spells.add({
        connector: "AAVE-V2-A",
        method: "deposit",
        args: [migrationData[i].token, dsa.maxValue, "0", "0"]
      });
    }
  }
}

if (migrationData.length == 0) {
  console.log("No lite position")
} else if (flashAmt) {

  spells.add({
    connector: "AAVE-V2-A",
    method: "borrow",
    args: [wethAddr, new BigNumber(flashAmt).times(new BigNumber(0.000501)).toFixed(0), "2", "0", "0"]
  });

  spells.add({
    connector: "AAVE-V2-A",
    method: "withdraw",
    args: [wethAddr, flashAmt, "0", "0"]
  });
  spells.add({
    connector: 'INSTAPOOL-C',
    method: 'flashPayback',
    args: [wethAddr, new BigNumber(flashAmt).times(new BigNumber(1.0005)).toFixed(0), "0", "0"],
  })

  const cd = dsa.instapool_v2.encodeFlashCastData(spells);
  let flashloanWrappedSpells = dsa.Spell();
  flashloanWrappedSpells.add({
    connector: 'INSTAPOOL-C',
    method: 'flashBorrowAndCast',
    args: [wethAddr, flashAmt, "5", cd, "0x"],
  })
  console.log("Transaction hash:",
    await dsa.cast({
      spells: flashloanWrappedSpells
    })
      .catch(err => {
        console.log(err)
      })
  )
} else {
  console.log("Transaction hash:",
    await dsa.cast({
      spells: spells
    })
      .catch(err => {
        console.log(err)
      })
  )
}
```
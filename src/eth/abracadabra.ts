import { ContractHelper } from '../library/contract.helper';
import { LoggerFactory } from '../library/LoggerFactory';
import { NetworkType, Web3Factory } from '../library/web3.factory';
import { SwissKnife } from '../library/swiss.knife';
import { MasterChefHelper } from '../library/master.chef';
import BigNumber from 'bignumber.js';

const network = NetworkType.ETH_MAIN;

const swissKnife = new SwissKnife(network);
const logger = LoggerFactory.getInstance().getLogger('main');

const Config = {
    //LP挖矿
    farmChef: {
        address: '0xf43480afe9863da4acbd4419a47d9cc7d25a647f',
        methods: {
            poolLength: 'poolLength',
            userInfo: 'userInfo',
            poolInfo: 'poolInfo',
            pendingReward: 'pendingIce',
            rewardToken: 'ice',
        },
        pool: {
            lpToken: 'stakingToken',
        },
    },
    spell: '0x090185f2135308bad17527004364ebcc2d37e5f6',
    sSpell: '0x26fa3fffb6efe8c1e69103acb4044c26b9a106a9', //SPELL.balanceOf(address(SSPELL)) / SSPELL.totalSupply()
    // https://debank.com/profile/0x99459a327e2e1f7535501aff6a1aada7024c45fd?chain=eth sSpell staking 测试地址
    borrow: {},
};

const callback3CRVLP = async (lptAddress: string, balance: BigNumber) => {
    const lpt = new ContractHelper(lptAddress, './Abracadabra/3crv.lpt.json', network);

    const totalSupply = new BigNumber(await lpt.callReadMethod('totalSupply'));

    const token0Address = await lpt.callReadMethod('coins', 0);
    const token0 = await swissKnife.syncUpTokenDB(token0Address);
    const token1Address = await lpt.callReadMethod('coins', 1);
    const token1 = await swissKnife.syncUpTokenDB(token1Address);

    const token0Balance = new BigNumber(await lpt.callReadMethod('balances', 0));
    const token1Balance = new BigNumber(await lpt.callReadMethod('balances', 1));

    const myRatio = balance.dividedBy(totalSupply);

    const myToken0Balance = token0Balance.multipliedBy(myRatio);
    const myToken1Balance = token1Balance.multipliedBy(myRatio);

    logger.info(
        `my staked token0 balance: ${myToken0Balance.dividedBy(Math.pow(10, token0.decimals)).toNumber().toFixed(6)} ${
            token0.symbol
        }`,
    );
    logger.info(
        `my staked token1 balance: ${myToken1Balance.dividedBy(Math.pow(10, token1.decimals)).toNumber().toFixed(6)} ${
            token1.symbol
        }`,
    );
};
//获取sSpell质押收据
const getsSPellReceipt = async (userAddress: string) => {
    const spell = new ContractHelper(Config.spell, './erc20.json', network);
    const spellToken = await swissKnife.syncUpTokenDB(Config.spell);

    const sSpell = new ContractHelper(Config.sSpell, './erc20.json', network);
    const sSpellToken = await swissKnife.syncUpTokenDB(Config.sSpell);

    const mysSpellBalance = new BigNumber(await sSpell.callReadMethod('balanceOf', userAddress));
    if (mysSpellBalance.gt(0)) {
        logger.info(
            `my staked sSpell balance: ${mysSpellBalance
                .dividedBy(Math.pow(10, sSpellToken.decimals))
                .toNumber()
                .toFixed(6)} ${sSpellToken.symbol}`,
        );
        //获取总共质押在sSpell合约的spell token数目
        const stakedSpellBalance = new BigNumber(await spell.callReadMethod('balanceOf', Config.sSpell));
        //获取sSpell总的铸造数目
        const totalsSpell = await sSpell.callReadMethod('totalSupply');
        //计算spell和sSpell的兑换率
        const exchangeRatio = stakedSpellBalance.dividedBy(totalsSpell);
        //将sSpell数量换算成对应的spell token数量
        const mySpellBalance = mysSpellBalance.multipliedBy(exchangeRatio);
        logger.info(
            `my staked spell balance: ${mySpellBalance
                .dividedBy(Math.pow(10, spellToken.decimals))
                .toNumber()
                .toFixed(6)} ${spellToken.symbol}`,
        );
    }
};

const masterChef = new MasterChefHelper(network, Config.farmChef, './Abracadabra/master.chef.json');

const main = async () => {
    //await masterChef.getFarmingReceiptsWithCallbacks('0xc218d847a18e521ae08f49f7c43882b6d1963c60', callback3CRVLP);
    //await masterChef.getFarmingReceiptsWithCallbacks('0xef2211dfd2e287a0a8d6505c6247bbe0db74ed91', callback3CRVLP);
    // const web3 = Web3Factory.getInstance().getWeb3(network);
    // const data = web3.eth.abi.encodeFunctionSignature('get(bytes)');
    // console.log(data);
    await getsSPellReceipt('0x99459a327e2e1f7535501aff6a1aada7024c45fd');
};

main().catch((e) => {
    logger.error(e.message);
});

import { NetworkType } from '../../library/web3.factory';
/**
 * TRANCHE_M = 0 // Token - Queen
 * TRANCHE_A = 1 // Token - Bishop
 * TRANCHE_B = 2 // Token - Rook
 */
export const Config = {
    network: NetworkType.BSC,
    dataProvider: '0x953Ffb6EDa97fA3e22bc1b869e4FE6bEaa6DcaF2',
    BTCFund: {
        primaryMarket: '0x19Ca3baAEAf37b857026dfEd3A0Ba63987A1008D',
        exchange: '0x1216Be0c4328E75aE9ADF726141C2254c2Dcc1b6',
        feeDistributor: '0x85ae5e9d510d8723438b0135CBf29d4F2E8BCda8',
        twapOracle: '0xE4e5c76C9F2274375297559aF030C4B55c7703EB',
        fund: '0xd6B3B86209eBb3C608f3F42Bf52818169944E402', // 获取token列表：tokenM : Queen | tokenA : Bishop | tokenB : Rook
        pancakePair: '0xf45cd219aef8618a92baa7ad848364a158a24f33',
        tokens: [
            '0x15D0318Fddf785aC0d3ba690C0033b3bedF4c648',
            '0x8cC456B384C8aD06BF430F4F130Aa63EF0dc6f85',
            '0x80da8Ca6c3DabD3a9f06Ca8eEed5d61687fab7ef',
        ],
    },
    ETHFund: {
        exchange: '0xB13a07C57bA5297506c71e9c958210Fea8bbCEF0',
        twapOracle: '0x7B38e4d28767638a1725766F8CDeEF4abD4b44f6',
        fund: '0x677B7304Cb944b413D3c9aEbc4D4B5DA1A698A6B', // 获取token列表：tokenM : Queen | tokenA : Bishop | tokenB : Rook
        tokens: [
            '0xEd3805EDE679cc48fe1E91E561138bca659fCA43',
            '0xfff9fC084cb58974DEfaa27E05e1FE2439B75dd9',
            '0xA0c1A9A702dE28d1562C423ccEF74Bbd45e4dCBb',
        ],
    },
    BNBFund: {
        primaryMarket: '0x15F2FeFcF313d397F9933C1Cb7590ab925d5cb59',
        exchange: '0x42867dF3c1ce62613aae3f4238cbcF3d7630880B',
        feeDistributor: '0xE06F85862af08c1C5F67F96e41eA663E29639DAe',
        twapOracle: '0xC8051D8A62851ad4b99B46d503Cb0b0b8C92F35d',
        fund: '0x629d4562033e432B390d0808B54A82B0C4A0896B', // 获取token列表：tokenM : Queen | tokenA : Bishop | tokenB : Rook
        pancakePair: '0x58f876857a02d6762e0101bb5c46a8c1ed44dc16',
        tokens: [
            '0xF8D829C3eB05C078e7911EfB3303C7899c8D2C3A',
            '0x9Fd554CDb6e77D9Aa048A37DCccee41FfFad1a90',
            '0x3A632B713637D837fF3b0e34D093A21DA1EF9fb1',
        ],
    },
    chessController: '0x0a7E898e1fAB8639dc3a416fE844662F209de8eD',
    chessToken: '0x20de22029ab63cf9a7cf5feb2b737ca1ee4c82a6',
    votingEscow: '0x95A2bBCD64E2859d40E2Ad1B5ba49Dc0e1Abc6C2',
    VOTING_ESCORW_MAX_TIME: 125798400, // 通过voting escow合约可以获取到
    chessPrice: 0.3322,
    rewardWeight: {
        M: 3,
        B: 2,
        A: 4,
    },
    v2: {
        BNBFund: {
            primaryMarket: '0x991c55304790c75cEbEe69da7601A18aA0977F24',
            primaryMarketRouter: '0xd5396F6D8173bD0a8f64c68d81b41a39162673eE',
            shareStaking: '0xFa7b73009d635b0AB069cBe99C5a5D498F701c76',
            twapOracle: '0x81f7bA3FaFEe999ab8cbfCd25058080A2068E6C4',
            fund: '0x7618f37EfE8930d5EE6da34185b3AbB750BD2a34', // 获取token列表：tokenM : Queen | tokenA : Bishop | tokenB : Rook
            tokens: [
                '0xA5b75770FfBCaC62AaC621d57D7ce9f4EA60D7e7',
                '0x20D269c5bF15B6679D832ED05734E30a7657dDF3',
                '0x89035Eb6dC4D3Bb504c39E05F6cf25a7C8F68bbC',
            ],
        }
    }
};

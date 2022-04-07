import { NetworkType } from '../../library/web3.factory'; 
/**
 * TRANCHE_M = 0 // Token - Queen
 * TRANCHE_A = 1 // Token - Bishop
 * TRANCHE_B = 2 // Token - Rook
 */
export const Config = {
    network: NetworkType.BSC,
    BTCFund: {
        exchange: '0x1216Be0c4328E75aE9ADF726141C2254c2Dcc1b6',
        twapOracle: '0xE4e5c76C9F2274375297559aF030C4B55c7703EB',
        fund: '0xd6B3B86209eBb3C608f3F42Bf52818169944E402', // 获取token列表：tokenM : Queen | tokenA : Bishop | tokenB : Rook
        tokens: ['0x15D0318Fddf785aC0d3ba690C0033b3bedF4c648','0x8cC456B384C8aD06BF430F4F130Aa63EF0dc6f85','0x80da8Ca6c3DabD3a9f06Ca8eEed5d61687fab7ef']
    },
    ETHFund: {
        exchange: '0xB13a07C57bA5297506c71e9c958210Fea8bbCEF0',
        twapOracle: '0x7B38e4d28767638a1725766F8CDeEF4abD4b44f6',
        fund: '0x677B7304Cb944b413D3c9aEbc4D4B5DA1A698A6B', // 获取token列表：tokenM : Queen | tokenA : Bishop | tokenB : Rook
        tokens: ['0xEd3805EDE679cc48fe1E91E561138bca659fCA43','0xfff9fC084cb58974DEfaa27E05e1FE2439B75dd9','0xA0c1A9A702dE28d1562C423ccEF74Bbd45e4dCBb']
    },
    BNBFund: {
        exchange: '0x42867dF3c1ce62613aae3f4238cbcF3d7630880B',
        twapOracle: '0xC8051D8A62851ad4b99B46d503Cb0b0b8C92F35d',
        fund: '0x629d4562033e432B390d0808B54A82B0C4A0896B', // 获取token列表：tokenM : Queen | tokenA : Bishop | tokenB : Rook
        tokens: ['0xF8D829C3eB05C078e7911EfB3303C7899c8D2C3A','0x9Fd554CDb6e77D9Aa048A37DCccee41FfFad1a90','0x3A632B713637D837fF3b0e34D093A21DA1EF9fb1']
    },
    chessController: '0x0a7E898e1fAB8639dc3a416fE844662F209de8eD',
    chessToken: '0x20de22029ab63cf9a7cf5feb2b737ca1ee4c82a6',
    votingEscow: '0x95A2bBCD64E2859d40E2Ad1B5ba49Dc0e1Abc6C2'
};

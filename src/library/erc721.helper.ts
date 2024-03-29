import { ContractHelper } from './contract.helper';
import { LoggerFactory } from './LoggerFactory';
import { NetworkType } from './web3.factory';
import { SwissKnife } from './swiss.knife';
import BigNumber from 'bignumber.js';

export interface MethodMap {
    balanceOf: string;
    tokenOfOwnerByIndex: string;
    tokenURI: string;
    ownerOf: string;
}

export interface NFTContractMetadata {
    address: string;
    methods: MethodMap;
}

export type NFTReceipt = {
    tokenIds: any[];
    customizedData: any[];
};

const logger = LoggerFactory.getInstance().getLogger('erc721');

export class ERC721Helper {
    protected swissKnife: SwissKnife;
    protected erc721: ContractHelper;
    protected metadata: NFTContractMetadata;
    public constructor(network: NetworkType, metadata: NFTContractMetadata, pathABIFile: string) {
        this.metadata = metadata;
        this.erc721 = new ContractHelper(this.metadata.address, pathABIFile, network);
        this.erc721.toggleHiddenExceptionOutput();
        this.swissKnife = new SwissKnife(network);
    }
    /**
     * 获取用户master chef挖矿的详情
     * 对应UI： Farm（双币LP）和Pool（单币LP）
     * @param userAddress 目标用户地址
     */
    public async getMyNFTReceipts(userAddress: string, callback = null): Promise<NFTReceipt> {
        try {
            const receipt: NFTReceipt = {
                tokenIds: [],
                customizedData: [],
            };
            //获取一般信息
            const symbol = await this.erc721.callReadMethod('symbol');

            //获取质押池的数量
            const tLength = await this.erc721.callReadMethod(this.metadata.methods.balanceOf, userAddress);
            logger.info(`getMyNFTReceipts > [${userAddress}]: ${tLength} ${symbol} tokens`);
            //遍历NFT Token
            for (let index = 0; index < tLength; index++) {
                const tokenId = await this.erc721.callReadMethod(
                    this.metadata.methods.tokenOfOwnerByIndex,
                    userAddress,
                    index,
                );
                receipt.tokenIds.push(tokenId);
                // const tokenURI = await this.erc721.callReadMethod(this.metadata.methods.tokenURI, tokenId);
                // logger.info(`${tokenId} : ${tokenURI}`);
                if (callback) {
                    logger.info(`getMyNFTReceipts > execute callback function to handle token - ${tokenId}`);
                    const ret = await callback(tokenId, this.erc721);
                    if (ret) {
                        receipt.customizedData.push(ret);
                    }
                }
            }
            return receipt;
        } catch (e) {
            logger.error(`getMyNFTReceipts > ${e.message}`);
        }
    }
    public async getOwnerOf(tokenId: number): Promise<string> {
        const owner = await this.erc721.callReadMethod(this.metadata.methods.ownerOf, tokenId);
        return owner;
    }
    public async tokenOfOwnerByIndex(owner: string, index: number): Promise<number> {
        const tokenId = await this.erc721.callReadMethod(this.metadata.methods.tokenOfOwnerByIndex, owner, index);
        return tokenId;
    }
    public async tokenURI(tokenId: number): Promise<string> {
        return await this.erc721.callReadMethod(this.metadata.methods.tokenURI, tokenId);
    }
    public async balanceOf(userAddress: string): Promise<number> {
        return await this.erc721.callReadMethod(this.metadata.methods.balanceOf, userAddress);
    }
}

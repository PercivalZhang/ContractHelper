import { AccountInfo, AccountLayout, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, u64 } from '@solana/spl-token';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID } from './constant';
import * as splToken from'@solana/spl-token';

export const findAssociatedTokenAddress = async (
    walletAddress: PublicKey,
    tokenMint: PublicKey,
): Promise<PublicKey> => {
    return (
        await PublicKey.findProgramAddress(
            [walletAddress.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), tokenMint.toBuffer()],
            ASSOCIATED_TOKEN_PROGRAM_ID,
        )
    )[0];
};

export function deserializeAccount(data: Buffer | undefined): AccountInfo | undefined  {
  if (data == undefined || data.length == 0) {
    return undefined;
  }

  const accountInfo = AccountLayout.decode(data);
  accountInfo.mint = new PublicKey(accountInfo.mint);
  accountInfo.owner = new PublicKey(accountInfo.owner);
  accountInfo.amount = u64.fromBuffer(accountInfo.amount);

  if (accountInfo.delegateOption === 0) {
    accountInfo.delegate = null;
    accountInfo.delegatedAmount = new u64(0);
  } else {
    accountInfo.delegate = new PublicKey(accountInfo.delegate);
    accountInfo.delegatedAmount = u64.fromBuffer(accountInfo.delegatedAmount);
  }

  accountInfo.isInitialized = accountInfo.state !== 0;
  accountInfo.isFrozen = accountInfo.state === 2;

  if (accountInfo.isNativeOption === 1) {
    accountInfo.rentExemptReserve = u64.fromBuffer(accountInfo.isNative);
    accountInfo.isNative = true;
  } else {
    accountInfo.rentExemptReserve = null;
    accountInfo.isNative = false;
  }

  if (accountInfo.closeAuthorityOption === 0) {
    accountInfo.closeAuthority = null;
  } else {
    accountInfo.closeAuthority = new PublicKey(accountInfo.closeAuthority);
  }

  return accountInfo;
};

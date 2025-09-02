/* eslint-disable @typescript-eslint/no-explicit-any */
import { PublicKey } from '@solana/web3.js';
import {
  BN,
  connection,
  FEE_OWNER,
  TOKEN_PROGRAM_ID,
  C98_TOKEN,
  USDC_TOKEN,
  createPool,
} from './common';

export const onCreatePool = async () => {
  const token0Mint = USDC_TOKEN.mintAddress;
  const token1Mint = C98_TOKEN.mintAddress;
  const token0Account = USDC_TOKEN.addressSPL;
  const token1Account = C98_TOKEN.addressSPL;

  const isStableCoin = false;
  const curveType = isStableCoin ? 1 : 0;
  const curveParameter = isStableCoin ? 1 : 0;

  const convertFromAmount = '1';
  const convertToAmount = '1';

  const response = await createPool(
    connection,
    '5UrM9csUEDBeBqMZTuuZyHRNhbRW4vQ1MgKJDrKU1U2v',
    new PublicKey(FEE_OWNER),
    new PublicKey(token0Mint),
    new PublicKey(token1Mint),
    new PublicKey(token0Account),
    new PublicKey(token1Account),
    convertFromAmount,
    convertToAmount,
    curveType,
    new BN(curveParameter),
    TOKEN_PROGRAM_ID
  );

  const { isError } = response as { isError?: boolean; mess?: string; hash?: string };
  if (isError) {
    return `Error: ${(response as any).mess}`;
  }
  return `Your transaction hash ${(response as any).hash}`;
};


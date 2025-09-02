/* eslint-disable @typescript-eslint/no-explicit-any */
import { PublicKey } from '@solana/web3.js';
import {
  connection,
  SLIPPAGE,
  poolParams,
  C98_TOKEN,
  USDC_TOKEN,
  SAROS_SWAP_PROGRAM_ADDRESS_V1,
  accountSol,
  getSwapAmountSaros,
  swapSaros,
} from './common';

export const onSwap = async () => {
  const fromTokenAccount = C98_TOKEN.addressSPL;
  const toTokenAccount = USDC_TOKEN.addressSPL;
  const fromMint = C98_TOKEN.mintAddress;
  const toMint = USDC_TOKEN.mintAddress;
  const fromAmount = 1;

  const estSwap = await getSwapAmountSaros(
    connection,
    fromMint,
    toMint,
    fromAmount,
    SLIPPAGE,
    poolParams
  );

  const { amountOutWithSlippage } = estSwap;
  const result = await swapSaros(
    connection,
    fromTokenAccount.toString(),
    toTokenAccount.toString(),
    parseFloat(fromAmount as unknown as string),
    parseFloat(amountOutWithSlippage),
    null,
    new PublicKey(poolParams.address),
    SAROS_SWAP_PROGRAM_ADDRESS_V1,
    accountSol,
    fromMint,
    toMint
  );

  const { isError } = result as { isError?: boolean; mess?: string; hash?: string };
  if (isError) {
    return `Error: ${(result as any).mess}`;
  }
  return `Your transaction hash ${(result as any).hash}`;
};


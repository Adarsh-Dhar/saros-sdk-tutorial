import { PublicKey } from '@solana/web3.js';
import {
  connection,
  SLIPPAGE,
  C98_TOKEN,
  USDC_TOKEN,
  poolParams,
  getPoolInfo,
  getTokenMintInfo,
  getTokenAccountInfo,
  depositAllTokenTypes,
  SAROS_SWAP_PROGRAM_ADDRESS_V1,
  accountSol,
} from './common';

export const onAddLiqPool = async () => {
  const poolAccountInfo = await getPoolInfo(
    connection,
    new PublicKey(poolParams.address)
  );

  const token0Mint = C98_TOKEN.mintAddress;
  const token1Mint = USDC_TOKEN.mintAddress;
  const token0Account = C98_TOKEN.addressSPL;
  const token1Account = USDC_TOKEN.addressSPL;
  const newPoolLpMintInfo = await getTokenMintInfo(
    connection,
    poolAccountInfo.lpTokenMint
  );

  const lpTokenSupply = newPoolLpMintInfo.supply
    ? newPoolLpMintInfo.supply.toNumber()
    : 0;

  const convertFromAmount = '1';
  const newPoolToken0AccountInfo = await getTokenAccountInfo(
    connection,
    poolAccountInfo.token0Account
  );

  const lpTokenAmount =
    (parseFloat(convertFromAmount) * lpTokenSupply) /
    newPoolToken0AccountInfo.amount.toNumber();

  const result = await depositAllTokenTypes(
    connection,
    accountSol,
    new PublicKey(accountSol),
    new PublicKey(token0Account),
    new PublicKey(token1Account),
    lpTokenAmount,
    new PublicKey(poolParams.address),
    SAROS_SWAP_PROGRAM_ADDRESS_V1,
    token0Mint,
    token1Mint,
    SLIPPAGE
  );

  const { isError } = result as { isError?: boolean; mess?: string; hash?: string };
  if (isError) {
    return `Error: ${(result as any).mess}`;
  }
  return `Your transaction hash ${(result as any).hash}`;
};


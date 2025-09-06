import { PublicKey, Transaction } from "@solana/web3.js";
import { liquidityBookServices, POOL_PARAMS } from "../index";

type Coin98SignTxResult = { publicKey: string; signature: string };
type Coin98Sol = {
  signTransaction?: (tx: unknown) => Promise<Coin98SignTxResult>;
  signAllTransactions?: (txs: unknown[]) => Promise<{ publicKey: string; signatures: string[] }>;
};
type Coin98Window = { sol?: Coin98Sol };

/**
 * Swap tokens using DLMM
 * 
 * This function demonstrates a complete swap flow:
 * 1. Get a quote for the swap
 * 2. Prepare the transaction
 * 3. Sign the transaction (wallet-adapter or Coin98 fallback)
 * 4. Send and confirm the transaction
 * 
 * Example: Swap 1 C98 → USDC on Devnet
 * 
 * @param payer - The wallet public key performing the swap
 * @param opts - Optional configuration including signTransaction function
 * @returns Transaction signature or error message
 */
export const onSwap = async (
  payer: PublicKey | null | undefined,
  opts?: {
    // Use unknown to avoid web3.js type version conflicts across packages
    signTransaction?: (tx: unknown) => Promise<unknown>;
  }
) => {
  if (!payer) return "Connect your wallet";

  // Step 1: Get a quote
  const amountFrom = 1e6; // 1 C98 (6 decimals)
  const quoteData = await liquidityBookServices.getQuote({
    amount: BigInt(amountFrom),
    isExactInput: true,
    swapForY: true,
    pair: new PublicKey(POOL_PARAMS.address),
    tokenBase: new PublicKey(POOL_PARAMS.baseToken.mintAddress),
    tokenQuote: new PublicKey(POOL_PARAMS.quoteToken.mintAddress),
    tokenBaseDecimal: POOL_PARAMS.baseToken.decimals,
    tokenQuoteDecimal: POOL_PARAMS.quoteToken.decimals,
    slippage: POOL_PARAMS.slippage,
  });

  const { amount, otherAmountOffset } = quoteData;

  // Step 2: Prepare transaction
  const tx = await liquidityBookServices.swap({
    amount,
    tokenMintX: new PublicKey(POOL_PARAMS.baseToken.mintAddress),
    tokenMintY: new PublicKey(POOL_PARAMS.quoteToken.mintAddress),
    otherAmountOffset,
    hook: new PublicKey(liquidityBookServices.hooksConfig),
    isExactInput: true,
    swapForY: true,
    pair: new PublicKey(POOL_PARAMS.address),
    payer,
  });

  // Ensure fee payer is the provided payer
  tx.feePayer = payer;

  // Step 3: Sign transaction (prefer wallet-adapter signer if provided)
  if (opts?.signTransaction) {
    const signedTxUnknown = await opts.signTransaction(tx as unknown);
    const signedTx = signedTxUnknown as unknown as Transaction;
    const sig = await liquidityBookServices.connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: true,
      preflightCommitment: "confirmed",
    });
    const { blockhash, lastValidBlockHeight } = await liquidityBookServices.connection.getLatestBlockhash();
    await liquidityBookServices.connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight });
    return sig;
  }

  // Fallback: Coin98 in-page signer (only if matches payer)
  const coin98Sol: Coin98Sol | undefined =
    typeof window !== "undefined"
      ? (window as unknown as { coin98?: Coin98Window }).coin98?.sol
      : undefined;
  if (!coin98Sol?.signTransaction) {
    return "Transaction prepared (no signer found).";
  }
  const response = await coin98Sol.signTransaction(tx);
  if (!response) return "User rejected";
  if (response.publicKey !== payer.toBase58()) {
    return `Signer mismatch. Expected ${payer.toBase58()}, got ${response.publicKey}`;
  }
  const publicKey = new PublicKey(response.publicKey);
  tx.addSignature(publicKey, bs58.decode(response.signature) as Buffer);

  // Step 4: Send and confirm transaction
  const sig = await liquidityBookServices.connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: true,
    preflightCommitment: "confirmed",
  });
  const { blockhash, lastValidBlockHeight } = await liquidityBookServices.connection.getLatestBlockhash();
  await liquidityBookServices.connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight });
  return sig;
};

// Import bs58 for signature decoding
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

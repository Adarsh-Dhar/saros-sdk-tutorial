import { PublicKey, Transaction } from "@solana/web3.js";
import { BIN_STEP_CONFIGS, liquidityBookServices, C98_TOKEN, USDC_TOKEN } from "../index";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

type Coin98SignTxResult = { publicKey: string; signature: string };
type Coin98Sol = {
  signTransaction?: (tx: unknown) => Promise<Coin98SignTxResult>;
  signAllTransactions?: (txs: unknown[]) => Promise<{ publicKey: string; signatures: string[] }>;
};
type Coin98Window = { sol?: Coin98Sol };

/**
 * Pool Creation
 * 
 * This module handles the creation of new DLMM pools.
 * Developers learn how to initialize new pools with specific parameters.
 */

/**
 * Create a new DLMM pool
 * 
 * This function demonstrates how to create a new pool:
 * 1. Set up pool parameters (base/quote tokens, bin step, rate price)
 * 2. Prepare the creation transaction
 * 3. Sign and send the transaction
 * 
 * Example: Create a WSOL–C98 pool on Devnet
 * 
 * @param payer - The wallet public key creating the pool
 * @param tokenX - Base token configuration (defaults to C98_TOKEN)
 * @param tokenY - Quote token configuration (defaults to USDC_TOKEN)
 * @param binStep - Bin step configuration (defaults to BIN_STEP_CONFIGS[3].binStep)
 * @param ratePrice - Initial rate price (defaults to 1)
 * @returns Transaction signature or error message
 */
export const onCreatePool = async (
  payer: PublicKey | null | undefined,
  options?: {
    tokenX?: typeof C98_TOKEN;
    tokenY?: typeof USDC_TOKEN;
    binStep?: number;
    ratePrice?: number;
  }
) => {
  if (!payer) return "Connect your wallet";

  const connection = liquidityBookServices.connection;
  const tokenX = options?.tokenX || C98_TOKEN;
  const tokenY = options?.tokenY || USDC_TOKEN;
  const binStep = options?.binStep || BIN_STEP_CONFIGS[3].binStep;
  const ratePrice = options?.ratePrice || 1;
  const payerPk = payer;

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash({ commitment: "confirmed" });
  
  // Create the pair with configuration
  const { tx } = await liquidityBookServices.createPairWithConfig({
    tokenBase: { mintAddress: tokenX.mintAddress, decimal: tokenX.decimals },
    tokenQuote: { mintAddress: tokenY.mintAddress, decimal: tokenY.decimals },
    ratePrice,
    binStep,
    payer: payerPk,
  });
  
  tx.recentBlockhash = blockhash;
  tx.feePayer = payerPk;

  // Sign transaction using Coin98
  const coin98Sol: Coin98Sol | undefined =
    typeof window !== "undefined"
      ? (window as unknown as { coin98?: Coin98Window }).coin98?.sol
      : undefined;
  const response = await coin98Sol?.signTransaction?.(tx);
  if (!response) return "User rejected";
  const publicKey = new PublicKey(response.publicKey);
  tx.addSignature(publicKey, bs58.decode(response.signature) as Buffer);

  // Send and confirm transaction
  const hash = await connection.sendRawTransaction(tx.serialize(), { 
    skipPreflight: true, 
    preflightCommitment: "confirmed" 
  });
  await connection.confirmTransaction({ 
    signature: hash, 
    blockhash, 
    lastValidBlockHeight 
  }, "finalized");
  
  return hash;
};

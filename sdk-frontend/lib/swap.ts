/* eslint-disable @typescript-eslint/no-explicit-any */
import { PublicKey, Transaction } from '@solana/web3.js';
import {
  connection,
  SLIPPAGE,
  poolParams,
  C98_TOKEN,
  USDC_TOKEN,
  SAROS_SWAP_PROGRAM_ADDRESS_V1,
  getSwapAmountSaros,
  swapSaros,
} from './common';

// Type declaration for Coin98 wallet
declare global {
  interface Window {
    coin98?: {
      sol?: {
        request: (params: any) => Promise<any>;
      };
    };
  }
}

export const onSwap = async (params?: {
  publicKey: PublicKey | null;
  sendTransaction?: any;
  signTransaction?: (tx: any) => Promise<any>;
}) => {
  if (!params?.publicKey) {
    throw new Error('Wallet not connected');
  }

  // Custom Coin98 signing function
  const signTransactionWithCoin98 = async (transaction: Transaction) => {
    if (!window.coin98?.sol) {
      throw new Error('Coin98 wallet not found');
    }

    try {
      // Ensure transaction has all required properties
      if (!transaction.feePayer) {
        transaction.feePayer = params.publicKey!;
      }
      if (!transaction.recentBlockhash) {
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
      }

      // Serialize the transaction to base64 for Coin98
      const serializedTransaction = transaction.serializeMessage();
      const base64Transaction = Buffer.from(serializedTransaction).toString('base64');

      // Sign with Coin98
      const result = await window.coin98.sol.request({
        method: 'sol_sign',
        params: [base64Transaction]
      });

      if (result && result.signature) {
        // Add the signature to the transaction
        const signature = Buffer.from(result.signature, 'base64');
        transaction.addSignature(transaction.feePayer, signature);
        return transaction;
      } else {
        throw new Error('No signature returned from Coin98');
      }
    } catch (error) {
      console.error('Coin98 signing error:', error);
      throw error;
    }
  };

  // Override the SDK's signTransaction function
  if (typeof window !== 'undefined' && window.coin98?.sol) {
    const originalRequest = window.coin98.sol.request;
    window.coin98.sol.request = async (requestParams: any) => {
      if (requestParams.method === 'sol_sign') {
        try {
          const transaction = requestParams.params[0];
          
          // If it's a Transaction object, use our custom signing
          if (transaction instanceof Transaction) {
            const signedTransaction = await signTransactionWithCoin98(transaction);
            return {
              signature: Buffer.from(signedTransaction.signatures[0].signature || Buffer.alloc(0)).toString('base64'),
              publicKey: signedTransaction.feePayer?.toBase58()
            };
          }
          
          // Otherwise, use the original request
          return originalRequest.call(window.coin98?.sol, requestParams);
        } catch (error) {
          console.error('Coin98 signing error:', error);
          throw error;
        }
      }
      return originalRequest.call(window.coin98?.sol, requestParams);
    };
  }

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
    params.publicKey.toString(),
    fromMint,
    toMint
  );

  const { isError } = result as { isError?: boolean; mess?: string; hash?: string };
  if (isError) {
    return `Error: ${(result as any).mess}`;
  }
  return `Your transaction hash ${(result as any).hash}`;
};


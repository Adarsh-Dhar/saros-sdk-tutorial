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
  wallet?: any;
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
      console.log('Original transaction:', transaction);
      console.log('Transaction instructions:', transaction.instructions);
      console.log('Transaction feePayer:', transaction.feePayer);
      console.log('Transaction recentBlockhash:', transaction.recentBlockhash);

      // Create a fresh transaction to avoid null value issues
      const freshTransaction = new Transaction();
      
      // Copy all instructions from the original transaction, but filter out any problematic ones
      if (transaction.instructions && transaction.instructions.length > 0) {
        console.log('Inspecting instructions in detail:');
        transaction.instructions.forEach((instruction, index) => {
          console.log(`Instruction ${index}:`, {
            programId: instruction.programId,
            keys: instruction.keys,
            data: instruction.data,
            keysLength: instruction.keys?.length,
            dataLength: instruction.data?.length
          });
          
          // Check each key in the instruction
          if (instruction.keys) {
            instruction.keys.forEach((key, keyIndex) => {
              console.log(`  Key ${keyIndex}:`, {
                pubkey: key.pubkey,
                isSigner: key.isSigner,
                isWritable: key.isWritable,
                pubkeyType: typeof key.pubkey,
                pubkeyValue: key.pubkey?.toString()
              });
            });
          }
        });

        const validInstructions = transaction.instructions.filter(instruction => {
          // Check if instruction has all required properties and no null values
          const isValid = instruction && 
                 instruction.programId && 
                 instruction.keys && 
                 instruction.data &&
                 instruction.keys.every(key => key && key.pubkey && key.pubkey.toString) &&
                 instruction.data.length >= 0; // Allow empty data arrays
          
          console.log('Instruction valid:', isValid);
          return isValid;
        });
        
        console.log('Valid instructions count:', validInstructions.length);
        
        if (validInstructions.length > 0) {
          freshTransaction.add(...validInstructions);
        } else {
          console.warn('No valid instructions found, trying to clean instructions with null pubkeys');
          
          // Try to clean instructions by removing null pubkeys
          const cleanedInstructions = transaction.instructions.map(instruction => {
            if (!instruction || !instruction.programId || !instruction.keys || !instruction.data) {
              return null;
            }
            
            // Filter out keys with null pubkeys
            const cleanKeys = instruction.keys.filter(key => key && key.pubkey && key.pubkey.toString);
            
            if (cleanKeys.length === 0) {
              return null; // Skip instruction if no valid keys
            }
            
            // Create a new instruction with clean keys
            return {
              programId: instruction.programId,
              keys: cleanKeys,
              data: instruction.data
            };
          }).filter(instruction => instruction !== null);
          
          console.log('Cleaned instructions count:', cleanedInstructions.length);
          
          if (cleanedInstructions.length > 0) {
            freshTransaction.add(...cleanedInstructions);
          } else {
            console.warn('No cleanable instructions found, using original transaction');
            // If no cleanable instructions, try to use the original transaction as-is
            return await signOriginalTransaction(transaction);
          }
        }
      }
      
      // Set required properties
      freshTransaction.feePayer = params.publicKey!;
      
      // Get the latest blockhash
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      freshTransaction.recentBlockhash = blockhash;

      console.log('Fresh transaction before serialization:', freshTransaction);

      // Validate transaction before serialization
      if (!freshTransaction.feePayer) {
        throw new Error('Transaction feePayer is not set');
      }
      if (!freshTransaction.recentBlockhash) {
        throw new Error('Transaction recentBlockhash is not set');
      }

      // Serialize the transaction to base64 for Coin98
      const serializedTransaction = freshTransaction.serializeMessage();
      const base64Transaction = Buffer.from(serializedTransaction).toString('base64');

      console.log('Serialized transaction length:', serializedTransaction.length);

      // Sign with Coin98
      const result = await window.coin98.sol.request({
        method: 'sol_sign',
        params: [base64Transaction]
      });

      if (result && result.signature) {
        // Validate signature format
        if (typeof result.signature !== 'string') {
          throw new Error('Invalid signature format from Coin98');
        }
        
        // Add the signature to the transaction
        const signature = Buffer.from(result.signature, 'base64');
        if (signature.length !== 64) {
          throw new Error('Invalid signature length from Coin98');
        }
        
        freshTransaction.addSignature(freshTransaction.feePayer, signature);
        return freshTransaction;
      } else {
        throw new Error('No signature returned from Coin98');
      }
    } catch (error) {
      console.error('Coin98 signing error:', error);
      throw error;
    }
  };

  // Fallback function to sign the original transaction
  const signOriginalTransaction = async (transaction: Transaction) => {
    try {
      // Try to fix the original transaction
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
      const result = await window.coin98?.sol?.request({
        method: 'sol_sign',
        params: [base64Transaction]
      });

      if (result && result.signature) {
        const signature = Buffer.from(result.signature, 'base64');
        transaction.addSignature(transaction.feePayer, signature);
        return transaction;
      } else {
        throw new Error('No signature returned from Coin98');
      }
    } catch (error) {
      console.error('Original transaction signing failed:', error);
      throw error;
    }
  };

  // Create a custom signTransaction function that respects the selected wallet
  const customSignTransaction = async (transaction: Transaction) => {
    // First, try to use the wallet adapter's signTransaction method directly
    if (params.wallet?.adapter?.signTransaction) {
      try {
        return await params.wallet.adapter.signTransaction(transaction);
      } catch (error) {
        console.error('Error with wallet adapter signTransaction:', error);
        // Fallback to Coin98 if the wallet adapter fails
      }
    }
    
    // Fallback to Coin98 only if no other wallet is available
    if (typeof window !== 'undefined' && window.coin98?.sol) {
      return await signTransactionWithCoin98(transaction);
    }
    
    throw new Error('No signing method available');
  };

  const fromTokenAccount = C98_TOKEN.addressSPL;
  const toTokenAccount = USDC_TOKEN.addressSPL;
  const fromMint = C98_TOKEN.mintAddress;
  const toMint = USDC_TOKEN.mintAddress;
  const fromAmount = 0.001; // Reduced amount to avoid insufficient balance issues

  // Debug: Check wallet balance and token accounts
  try {
    const walletBalance = await connection.getBalance(params.publicKey);
    console.log('Wallet SOL balance:', walletBalance / 1e9, 'SOL');
    
    // Check if token accounts exist
    const fromTokenAccountInfo = await connection.getAccountInfo(new PublicKey(fromTokenAccount));
    const toTokenAccountInfo = await connection.getAccountInfo(new PublicKey(toTokenAccount));
    
    console.log('From token account exists:', !!fromTokenAccountInfo);
    console.log('To token account exists:', !!toTokenAccountInfo);
    
    if (fromTokenAccountInfo) {
      console.log('From token account owner:', fromTokenAccountInfo.owner.toString());
    }
    if (toTokenAccountInfo) {
      console.log('To token account owner:', toTokenAccountInfo.owner.toString());
    }
  } catch (error) {
    console.log('Error checking balances:', error);
  }

  // Solution 1: Match the exact SDK example format
  const estSwap = await getSwapAmountSaros(
    connection,
    fromMint,
    toMint,
    fromAmount,
    SLIPPAGE,
    poolParams
  );

  const { amountOutWithSlippage } = estSwap;
  
  console.log('Estimated swap output:', amountOutWithSlippage);
  
  // Check if we need to create associated token accounts
  const { 
    getAssociatedTokenAddress, 
    createAssociatedTokenAccountInstruction
  } = await import('@solana/spl-token');
  
  try {
    const fromATA = await getAssociatedTokenAddress(
      new PublicKey(fromMint),
      params.publicKey
    );
    const toATA = await getAssociatedTokenAddress(
      new PublicKey(toMint),
      params.publicKey
    );
    
    console.log('From ATA:', fromATA.toString());
    console.log('To ATA:', toATA.toString());
    
    // Check if ATAs exist
    const fromATAInfo = await connection.getAccountInfo(fromATA);
    const toATAInfo = await connection.getAccountInfo(toATA);
    
    console.log('From ATA exists:', !!fromATAInfo);
    console.log('To ATA exists:', !!toATAInfo);
    
    // Create missing ATAs
    const createATATransaction = new Transaction();
    let needsATACreation = false;
    
    if (!fromATAInfo) {
      console.log('Creating From ATA for C98...');
      const createFromATAInstruction = createAssociatedTokenAccountInstruction(
        params.publicKey, // payer
        fromATA, // associatedToken
        params.publicKey, // owner
        new PublicKey(fromMint) // mint
      );
      createATATransaction.add(createFromATAInstruction);
      needsATACreation = true;
    }
    
    if (!toATAInfo) {
      console.log('Creating To ATA for USDC...');
      const createToATAInstruction = createAssociatedTokenAccountInstruction(
        params.publicKey, // payer
        toATA, // associatedToken
        params.publicKey, // owner
        new PublicKey(toMint) // mint
      );
      createATATransaction.add(createToATAInstruction);
      needsATACreation = true;
    }
    
    // Execute ATA creation transaction if needed
    if (needsATACreation) {
      console.log('Creating missing token accounts...');
      
      // Set transaction properties
      createATATransaction.feePayer = params.publicKey;
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      createATATransaction.recentBlockhash = blockhash;
      
      // Sign and send the ATA creation transaction
      const signedATATransaction = await customSignTransaction(createATATransaction);
      const ataTxHash = await connection.sendRawTransaction(signedATATransaction.serialize());
      
      console.log('ATA creation transaction sent:', ataTxHash);
      
      // Wait for confirmation
      await connection.confirmTransaction(ataTxHash, 'confirmed');
      console.log('ATA creation confirmed');
    }
  } catch (error) {
    console.log('Error checking/creating ATAs:', error);
    return `Error creating token accounts: ${error}`;
  }
  
  // CORRECT APPROACH: Match SDK example exactly with proper parameter order
  // But we need to handle Coin98 signing by overriding the global signTransaction
  if (typeof window !== 'undefined' && window.coin98?.sol) {
    // Store original signTransaction if it exists
    const originalSignTransaction = window.coin98.sol.request;
    
    // Override the signTransaction method for this specific call
    window.coin98.sol.request = async (requestParams: any) => {
      if (requestParams.method === 'sol_sign') {
        try {
          const transaction = requestParams.params[0];
          if (transaction instanceof Transaction) {
            return await signTransactionWithCoin98(transaction);
          }
          return originalSignTransaction.call(window.coin98?.sol, requestParams);
        } catch (error) {
          console.error('Coin98 signing error:', error);
          throw error;
        }
      }
      return originalSignTransaction.call(window.coin98?.sol, requestParams);
    };
  }

  const result = await swapSaros(
    connection,
    fromTokenAccount.toString(),
    toTokenAccount.toString(),
    parseFloat(fromAmount as unknown as string),
    parseFloat(amountOutWithSlippage),
    null, // signTransaction parameter - pass null like SDK example
    new PublicKey(poolParams.address),
    SAROS_SWAP_PROGRAM_ADDRESS_V1,
    params.publicKey.toString(), // wallet address as string (9th parameter)
    fromMint,
    toMint
  );

  const { isError, mess, hash } = result as { isError?: boolean; mess?: string; hash?: string };
  if (isError) {
    return `Error: ${mess || 'Unknown error occurred'}`;
  }
  return `Your transaction hash ${hash || 'No hash returned'}`;
};


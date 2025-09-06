import { PublicKey, Transaction, Keypair } from "@solana/web3.js";
import {
  LiquidityShape,
  PositionInfo,
  RemoveLiquidityType,
  Distribution,
} from "@saros-finance/dlmm-sdk/types/services";
import {
  createUniformDistribution,
  findPosition,
  getBinRange,
  getMaxBinArray,
  getMaxPosition,
} from "@saros-finance/dlmm-sdk/utils";
import bigDecimal from "js-big-decimal";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { liquidityBookServices, POOL_PARAMS, C98_TOKEN, USDC_TOKEN } from "../index";

type Coin98SignTxResult = { publicKey: string; signature: string };
type Coin98Sol = {
  signTransaction?: (tx: unknown) => Promise<Coin98SignTxResult>;
  signAllTransactions?: (txs: unknown[]) => Promise<{ publicKey: string; signatures: string[] }>;
};
type Coin98Window = { sol?: Coin98Sol };

/**
 * Liquidity Management
 * 
 * This module handles adding and removing liquidity in DLMM pools.
 * Developers learn how to LP in DLMM, understand how bins work, and reclaim tokens.
 */

/**
 * Convert balance to wei (smallest unit)
 * 
 * @param strValue - The value to convert
 * @param iDecimal - Number of decimals (defaults to 9)
 * @returns The converted value in wei
 */
export const convertBalanceToWei = (strValue: number, iDecimal: number = 9) => {
  if (strValue === 0) return 0;
  try {
    const multiplyNum = new bigDecimal(Math.pow(10, iDecimal));
    const convertValue = new bigDecimal(Number(strValue));
    const result = multiplyNum.multiply(convertValue);
    return result.getValue();
  } catch {
    return 0;
  }
};

/**
 * Add liquidity to a DLMM pool
 * 
 * This function demonstrates how to add liquidity with bins, positions, and distributions:
 * 1. Get user positions and pair info
 * 2. Calculate max positions and liquidity distributions
 * 3. Create positions if needed
 * 4. Add liquidity to positions
 * 5. Sign and send transactions
 * 
 * Example: Add liquidity into [-10, +10] bins
 * 
 * @param payer - The wallet public key adding liquidity
 * @param options - Configuration options for liquidity addition
 * @returns Array of transaction signatures or error message
 */
export const onAddLiquidity = async (
  payer: PublicKey | null | undefined,
  options?: {
    tokenX?: typeof C98_TOKEN;
    tokenY?: typeof USDC_TOKEN;
    pairAddress?: string;
    shape?: LiquidityShape;
    binRange?: [number, number];
    amountX?: number;
    amountY?: number;
  }
) => {
  if (!payer) return "Connect your wallet";

  const tokenX = options?.tokenX || C98_TOKEN;
  const tokenY = options?.tokenY || USDC_TOKEN;
  const payerPk = payer;
  const pair = new PublicKey(options?.pairAddress || POOL_PARAMS.address);
  const shape = options?.shape || LiquidityShape.Spot;
  const binRange = options?.binRange || [-10, 10] as [number, number];

  const positions = await liquidityBookServices.getUserPositions({ payer: payerPk, pair });
  const pairInfo = await liquidityBookServices.getPairAccount(pair);
  const activeBin = pairInfo.activeId;
  const connection = liquidityBookServices.connection;

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  let currentBlockhash = blockhash;
  let currentLastValidBlockHeight = lastValidBlockHeight;

  const maxPositionList = getMaxPosition([binRange[0], binRange[1]], activeBin);
  const maxLiqDistribution = createUniformDistribution({ shape, binRange });
  const binArrayList = getMaxBinArray(binRange, activeBin);

  const allTxs: unknown[] = [];
  const txsCreatePosition: unknown[] = [];

  const maxLiquidityDistributions = await Promise.all(
    maxPositionList.map(async (item: number) => {
      const { range: relativeBinRange, binLower, binUpper } = getBinRange(item, activeBin);
      const currentPosition = positions.find(findPosition(item, activeBin));

      const findStartIndex = maxLiqDistribution.findIndex((d: { relativeBinId: number }) => d.relativeBinId === relativeBinRange[0]);
      const startIndex = findStartIndex === -1 ? 0 : findStartIndex;
      const findEndIndex = maxLiqDistribution.findIndex((d: { relativeBinId: number }) => d.relativeBinId === relativeBinRange[1]);
      const endIndex = findEndIndex === -1 ? maxLiqDistribution.length : findEndIndex + 1;
      const liquidityDistribution = maxLiqDistribution.slice(startIndex, endIndex);

      const binArray = binArrayList.find((b: { binArrayLowerIndex: number; binArrayUpperIndex: number }) => b.binArrayLowerIndex * 256 <= binLower && (b.binArrayUpperIndex + 1) * 256 > binUpper)!;
      const binArrayLower = await liquidityBookServices.getBinArray({ binArrayIndex: binArray.binArrayLowerIndex, pair, payer: payerPk });
      const binArrayUpper = await liquidityBookServices.getBinArray({ binArrayIndex: binArray.binArrayUpperIndex, pair, payer: payerPk });

      if (!currentPosition) {
        const positionMint = Keypair.generate();
        const txCreate = new Transaction();
        const { position } = await liquidityBookServices.createPosition({
          pair,
          payer: payerPk,
          relativeBinIdLeft: relativeBinRange[0],
          relativeBinIdRight: relativeBinRange[1],
          binArrayIndex: binArray.binArrayLowerIndex,
          positionMint: positionMint.publicKey,
          // @ts-expect-error cross web3.js types
          transaction: txCreate,
        });
        (txCreate as Transaction).feePayer = payerPk;
        (txCreate as Transaction).recentBlockhash = currentBlockhash;
        (txCreate as Transaction).sign(positionMint);
        txsCreatePosition.push(txCreate);
        allTxs.push(txCreate);
        return { positionMint: positionMint.publicKey.toString(), position, liquidityDistribution, binArrayLower: binArrayLower.toString(), binArrayUpper: binArrayUpper.toString() };
      }

      return { positionMint: currentPosition.positionMint, liquidityDistribution, binArrayLower: binArrayLower.toString(), binArrayUpper: binArrayUpper.toString() };
    })
  );

  const txsAddLiquidity = await Promise.all(
    maxLiquidityDistributions.map(async (
      { binArrayLower, binArrayUpper, liquidityDistribution, positionMint }: { binArrayLower: string; binArrayUpper: string; liquidityDistribution: Distribution[]; positionMint: string }
    ) => {
      const txAdd = new Transaction();
      await liquidityBookServices.addLiquidityIntoPosition({
        amountX: options?.amountX || Number(convertBalanceToWei(10, tokenX.decimals)),
        amountY: options?.amountY || Number(convertBalanceToWei(10, tokenY.decimals)),
        binArrayLower: new PublicKey(binArrayLower),
        binArrayUpper: new PublicKey(binArrayUpper),
        liquidityDistribution,
        pair,
        positionMint: new PublicKey(positionMint),
        payer: payerPk,
        // @ts-expect-error cross web3.js types
        transaction: txAdd,
      });
      (txAdd as Transaction).recentBlockhash = currentBlockhash;
      (txAdd as Transaction).feePayer = payerPk;
      allTxs.push(txAdd);
      return txAdd;
    })
  );

  const coin98Sol2: Coin98Sol | undefined =
    typeof window !== "undefined"
      ? (window as unknown as { coin98?: Coin98Window }).coin98?.sol
      : undefined;
  const response = await coin98Sol2?.signAllTransactions?.(allTxs);
  if (!response) return "User rejected";
  const publicKey = new PublicKey(response.publicKey);
  const signatures = response.signatures as string[];
  const signedTxs = allTxs.map((transaction, index) => {
    const signature = bs58.decode(signatures[index]!);
    (transaction as unknown as Transaction).addSignature(publicKey, signature);
    return transaction as unknown as Transaction;
  });

  const hash: string[] = [];

  if (txsCreatePosition.length) {
    await Promise.all(
      txsCreatePosition.map(async (tx: unknown) => {
        const toSend = (signedTxs.shift() || tx) as Transaction;
        const serializeTx = toSend.serialize();
        const txHash = await connection.sendRawTransaction(serializeTx, { skipPreflight: false, preflightCommitment: "confirmed" });
        hash.push(txHash);
        await connection.confirmTransaction({ signature: txHash, blockhash: currentBlockhash, lastValidBlockHeight: currentLastValidBlockHeight }, "finalized");
      })
    );
    const latest = await connection.getLatestBlockhash();
    currentBlockhash = latest.blockhash;
    currentLastValidBlockHeight = latest.lastValidBlockHeight;
  }

  await Promise.all(
    txsAddLiquidity.map(async (tx: unknown) => {
      const toSend = (signedTxs.shift() || tx) as Transaction;
      const serializeTx = toSend.serialize();
      const txHash = await connection.sendRawTransaction(serializeTx, { skipPreflight: false, preflightCommitment: "confirmed" });
      hash.push(txHash);
      await connection.confirmTransaction({ signature: txHash, blockhash: currentBlockhash, lastValidBlockHeight: currentLastValidBlockHeight }, "finalized" );
    })
  );

  return hash;
};

/**
 * Remove liquidity from a DLMM pool
 * 
 * This function demonstrates how to remove liquidity across ranges:
 * 1. Get user positions and filter by range
 * 2. Calculate position list for removal
 * 3. Create removal transactions
 * 4. Sign and send transactions
 * 
 * Example: Remove liquidity from a 7-bin range
 * 
 * @param payer - The wallet public key removing liquidity
 * @param options - Configuration options for liquidity removal
 * @returns Array of transaction signatures or error message
 */
export const onRemoveLiquidity = async (
  payer: PublicKey | null | undefined,
  options?: {
    tokenX?: typeof C98_TOKEN;
    tokenY?: typeof USDC_TOKEN;
    pairAddress?: string;
    type?: RemoveLiquidityType;
    range?: [number, number];
  }
) => {
  if (!payer) return "Connect your wallet";

  const tokenX = options?.tokenX || C98_TOKEN;
  const tokenY = options?.tokenY || USDC_TOKEN;
  const connection = liquidityBookServices.connection;
  const type = options?.type || RemoveLiquidityType.Both;
  const pair = new PublicKey(options?.pairAddress || POOL_PARAMS.address);
  const payerPk = payer;

  const pairInfo = await liquidityBookServices.getPairAccount(pair);
  const activeId = pairInfo.activeId;
  const range = options?.range || [activeId - 3, activeId + 3] as [number, number];

  const positions = await liquidityBookServices.getUserPositions({ payer: payerPk, pair });
  const positionList = positions.filter((item: PositionInfo) => !(item.upperBinId < range[0] || item.lowerBinId > range[1]));
  if (!positionList.length) throw Error("No position found in this range");

  const maxPositionList = positionList.map((item: PositionInfo) => {
    const start = range[0] > item.lowerBinId ? range[0] : item.lowerBinId;
    const end = range[1] < item.upperBinId ? range[1] : item.upperBinId;
    return { position: item.position, start, end, positionMint: item.positionMint };
  });

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash({ commitment: "confirmed" });
  const { txs, txCreateAccount, txCloseAccount } = await liquidityBookServices.removeMultipleLiquidity({
    maxPositionList,
    payer: payerPk,
    type,
    pair,
    tokenMintX: new PublicKey(tokenX.mintAddress),
    tokenMintY: new PublicKey(tokenY.mintAddress),
    activeId,
  });

  const allTxs = [...txs];
  if (txCreateAccount) allTxs.unshift(txCreateAccount);
  if (txCloseAccount) allTxs.push(txCloseAccount);
  allTxs.forEach((tx) => { tx.feePayer = payerPk; tx.recentBlockhash = blockhash; });

  const coin98Sol3: Coin98Sol | undefined =
    typeof window !== "undefined"
      ? (window as unknown as { coin98?: Coin98Window }).coin98?.sol
      : undefined;
  const response = await coin98Sol3?.signAllTransactions?.(allTxs);
  if (!response) return "User rejected";
  const publicKey = new PublicKey(response.publicKey);
  const signatures = response.signatures as string[];
  const signedTxs2 = allTxs.map((transaction, index) => {
    const signature = bs58.decode(signatures[index]!);
    (transaction as unknown as Transaction).addSignature(publicKey, signature);
    return transaction as unknown as Transaction;
  });

  if (txCreateAccount) {
    const tx = signedTxs2.shift() || txCreateAccount;
    const hash = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: true, preflightCommitment: "finalized" });
    await connection.confirmTransaction({ signature: hash, blockhash, lastValidBlockHeight });
  }

  const latest = await connection.getLatestBlockhash({ commitment: "confirmed" });
  const newBlockhash = latest.blockhash;
  const newLastValidBlockHeight = latest.lastValidBlockHeight;

  const hash: string[] = [];
  await Promise.all(
    txs.map(async (_tx: unknown) => {
      const tx = (signedTxs2.shift() || _tx) as Transaction;
      const txHash = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: true, preflightCommitment: "confirmed" });
      hash.push(txHash);
      await connection.confirmTransaction({ signature: txHash, blockhash: newBlockhash, lastValidBlockHeight: newLastValidBlockHeight }, "finalized");
    })
  );

  if (txCloseAccount) {
    const tx = signedTxs2.shift() || txCloseAccount;
    const txHash = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: true, preflightCommitment: "finalized" });
    hash.push(txHash);
  }
  return hash;
};

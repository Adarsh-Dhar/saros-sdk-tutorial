import {
  BIN_STEP_CONFIGS,
  LiquidityBookServices,
  MODE,
} from "@saros-finance/dlmm-sdk";
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

type Coin98SignTxResult = { publicKey: string; signature: string };
type Coin98Sol = {
  signTransaction?: (tx: unknown) => Promise<Coin98SignTxResult>;
  signAllTransactions?: (txs: unknown[]) => Promise<{ publicKey: string; signatures: string[] }>;
};
type Coin98Window = { sol?: Coin98Sol };

// Deprecated: previously used placeholder wallet constant. Use connected wallet PublicKey instead.
// export const YOUR_WALLET = "";

export const liquidityBookServices = new LiquidityBookServices({
  mode: MODE.DEVNET,
});

// Example tokens and pool (MAINNET)
// DEVNET WSOL
export const USDC_TOKEN = {
  id: "wsol",
  mintAddress: "So11111111111111111111111111111111111111112",
  symbol: "WSOL",
  name: "WSOL",
  decimals: 9,
  addressSPL: "",
};

// DEVNET Saros
export const C98_TOKEN = {
  id: "saros",
  mintAddress: "mntCAkd76nKSVTYxwu8qwQnhPcEE9JyEbgW6eEpwr1N",
  symbol: "DEXV3-SAROS",
  name: "Dex V3 Saros",
  decimals: 6,
  addressSPL: "",
};

export const POOL_PARAMS = {
  address: "C8xWcMpzqetpxwLj7tJfSQ6J8Juh1wHFdT5KrkwdYPQB",
  baseToken: C98_TOKEN,
  quoteToken: USDC_TOKEN,
  slippage: 0.5,
  hook: "",
};

// Helpers
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

// Swap (C98 -> USDC)
export const onSwap = async (
  payer: PublicKey | null | undefined,
  opts?: {
    // Use unknown to avoid web3.js type version conflicts across packages
    signTransaction?: (tx: unknown) => Promise<unknown>;
  }
) => {
  if (!payer) return "Connect your wallet";

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

  // Prefer wallet-adapter signer if provided
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

  const sig = await liquidityBookServices.connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: true,
    preflightCommitment: "confirmed",
  });
  const { blockhash, lastValidBlockHeight } = await liquidityBookServices.connection.getLatestBlockhash();
  await liquidityBookServices.connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight });
  return sig;
};

// Read-only helpers
export const getDexName = () => {
  try {
    return liquidityBookServices.getDexName();
  } catch {
    return "";
  }
};

export const getDexProgramId = () => {
  try {
    return liquidityBookServices.getDexProgramId();
  } catch {
    return "";
  }
};

export const getPoolAddresses = async () => {
  try {
    return await liquidityBookServices.fetchPoolAddresses();
  } catch {
    return [] as string[];
  }
};

export const fetchPoolMetadata = async () => {
  try {
    return await liquidityBookServices.fetchPoolMetadata(POOL_PARAMS.address);
  } catch {
    return {} as Record<string, unknown>;
  }
};

export const onListenNewPoolAddress = async () => {
  const postTx = async (poolAddress: string) => {
    console.log("[DLMM] New pool:", poolAddress);
  };
  await liquidityBookServices.listenNewPoolAddress(postTx);
  return "Listening for new pools...";
};

// Create Pair
export const onCreatePool = async (payer: PublicKey | null | undefined) => {
  if (!payer) return "Connect your wallet";

  const connection = liquidityBookServices.connection;
  const tokenX = C98_TOKEN;
  const tokenY = USDC_TOKEN;
  const binStep = BIN_STEP_CONFIGS[3].binStep;
  const ratePrice = 1;
  const payerPk = payer;

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash({ commitment: "confirmed" });
  const { tx } = await liquidityBookServices.createPairWithConfig({
    tokenBase: { mintAddress: tokenX.mintAddress, decimal: tokenX.decimals },
    tokenQuote: { mintAddress: tokenY.mintAddress, decimal: tokenY.decimals },
    ratePrice,
    binStep,
    payer: payerPk,
  });
  tx.recentBlockhash = blockhash;
  tx.feePayer = payerPk;

  const coin98Sol: Coin98Sol | undefined =
    typeof window !== "undefined"
      ? (window as unknown as { coin98?: Coin98Window }).coin98?.sol
      : undefined;
  const response = await coin98Sol?.signTransaction?.(tx);
  if (!response) return "User rejected";
  const publicKey = new PublicKey(response.publicKey);
  tx.addSignature(publicKey, bs58.decode(response.signature) as Buffer);

  const hash = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: true, preflightCommitment: "confirmed" });
  await connection.confirmTransaction({ signature: hash, blockhash, lastValidBlockHeight }, "finalized");
  return hash;
};

// Add Liquidity (max-positions demo)
export const onAddLiquidity = async (payer: PublicKey | null | undefined) => {
  if (!payer) return "Connect your wallet";

  const tokenX = C98_TOKEN;
  const tokenY = USDC_TOKEN;
  const payerPk = payer;
  const pair = new PublicKey(POOL_PARAMS.address);
  const shape = LiquidityShape.Spot;
  const binRange = [-10, 10] as [number, number];

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
        amountX: Number(convertBalanceToWei(10, tokenX.decimals)),
        amountY: Number(convertBalanceToWei(10, tokenY.decimals)),
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

// Remove Liquidity
export const onRemoveLiquidity = async (payer: PublicKey | null | undefined) => {
  if (!payer) return "Connect your wallet";

  const tokenX = C98_TOKEN;
  const tokenY = USDC_TOKEN;
  const connection = liquidityBookServices.connection;
  const type = RemoveLiquidityType.Both;
  const pair = new PublicKey(POOL_PARAMS.address);
  const payerPk = payer;

  const pairInfo = await liquidityBookServices.getPairAccount(pair);
  const activeId = pairInfo.activeId;
  const range = [activeId - 3, activeId + 3] as [number, number];

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

const api = {
  onSwap,
  getDexName,
  getDexProgramId,
  getPoolAddresses,
  fetchPoolMetadata,
  onListenNewPoolAddress,
  onCreatePool,
  onAddLiquidity,
  onRemoveLiquidity,
};
export default api;



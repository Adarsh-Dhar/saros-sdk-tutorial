"use client";
import { useCallback, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Transaction } from "@solana/web3.js";
import {
  onSwapFrontend,
  onCreatePool,
  onAddLiqPool,
  onRemoveLiqPool,
  getListFarmSaros,
  getListStakeSaros,
  onStakePool,
  onUnStakePool,
  onClaimReward,
} from "../lib";

type ActionKey =
  | "swap"
  | "createPool"
  | "addLiquidity"
  | "removeLiquidity"
  | "getFarms"
  | "getStakes"
  | "stakePool"
  | "unstakePool"
  | "claimReward";

export default function Home() {
  const [activeAction, setActiveAction] = useState<ActionKey | null>(null);
  const [output, setOutput] = useState<string>("");
  const { publicKey, sendTransaction, wallet, connected } = useWallet();
  const { setVisible } = useWalletModal();

  const actions = useMemo(
    () => ({
      swap: async () => {
        const adapter: unknown = wallet?.adapter;
        const adapterHasSignTransaction = Boolean(
          adapter && typeof (adapter as { signTransaction?: unknown }).signTransaction === 'function'
        );
        const canSign = Boolean(sendTransaction || adapterHasSignTransaction);
        if (!connected || !publicKey || !canSign) {
          setVisible(true);
          return "Please connect a wallet to proceed.";
        }
        return await onSwapFrontend({
          publicKey: publicKey ?? null,
          sendTransaction,
          signTransaction: (adapter as { signTransaction?: (tx: Transaction) => Promise<Transaction> }).signTransaction,
          wallet,
        });
      },
      createPool: async () => await onCreatePool(),
      addLiquidity: async () => await onAddLiqPool(),
      removeLiquidity: async () => await onRemoveLiqPool(),
      getFarms: async () => {
        const res = await getListFarmSaros();
        return JSON.stringify(res, null, 2);
      },
      getStakes: async () => {
        const res = await getListStakeSaros();
        return JSON.stringify(res, null, 2);
      },
      stakePool: async () => await onStakePool(),
      unstakePool: async () => await onUnStakePool(),
      claimReward: async () => await onClaimReward(),
    }), [publicKey, sendTransaction, wallet, connected, setVisible]);

  const run = useCallback(async (key: ActionKey) => {
    setActiveAction(key);
    setOutput("");
    try {
      console.log("[SarosSDK]", key, "start");
      const res = await actions[key]();
      console.log("[SarosSDK]", key, "success:", res);
      setOutput(typeof res === "string" ? res : JSON.stringify(res, null, 2));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("[SarosSDK]", key, "error:", e);
      setOutput(`Error: ${message}`);
    } finally {
      setActiveAction(null);
    }
  }, [actions]);

  return (
    <div className="min-h-dvh w-full px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-semibold tracking-tight">Saros SDK Playground</h1>
        <p className="mt-2 text-sm opacity-70">Trigger any action below and inspect the response.</p>

        <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={() => run("swap")}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
            disabled={activeAction !== null}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">Swap</span>
              {activeAction === "swap" && <Spinner />}
            </div>
            <p className="mt-1 text-xs opacity-70">Execute token swap via pool.</p>
          </button>

          <button
            onClick={() => run("createPool")}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
            disabled={activeAction !== null}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">Create Pool</span>
              {activeAction === "createPool" && <Spinner />}
            </div>
            <p className="mt-1 text-xs opacity-70">Initialize a new pool with params.</p>
          </button>

          <button
            onClick={() => run("addLiquidity")}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
            disabled={activeAction !== null}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">Add Liquidity</span>
              {activeAction === "addLiquidity" && <Spinner />}
            </div>
            <p className="mt-1 text-xs opacity-70">Deposit tokens to receive LP.</p>
          </button>

          <button
            onClick={() => run("removeLiquidity")}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
            disabled={activeAction !== null}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">Remove Liquidity</span>
              {activeAction === "removeLiquidity" && <Spinner />}
            </div>
            <p className="mt-1 text-xs opacity-70">Burn LP to withdraw tokens.</p>
          </button>

          <button
            onClick={() => run("getFarms")}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
            disabled={activeAction !== null}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">Get Farms</span>
              {activeAction === "getFarms" && <Spinner />}
            </div>
            <p className="mt-1 text-xs opacity-70">Fetch Saros farm pools.</p>
          </button>

          <button
            onClick={() => run("getStakes")}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
            disabled={activeAction !== null}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">Get Stake Pools</span>
              {activeAction === "getStakes" && <Spinner />}
            </div>
            <p className="mt-1 text-xs opacity-70">Fetch Saros stake pools.</p>
          </button>

          <button
            onClick={() => run("stakePool")}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
            disabled={activeAction !== null}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">Stake Pool</span>
              {activeAction === "stakePool" && <Spinner />}
            </div>
            <p className="mt-1 text-xs opacity-70">Stake LP tokens into farm.</p>
          </button>

          <button
            onClick={() => run("unstakePool")}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
            disabled={activeAction !== null}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">Unstake Pool</span>
              {activeAction === "unstakePool" && <Spinner />}
            </div>
            <p className="mt-1 text-xs opacity-70">Unstake LP tokens from farm.</p>
          </button>

          <button
            onClick={() => run("claimReward")}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
            disabled={activeAction !== null}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">Claim Reward</span>
              {activeAction === "claimReward" && <Spinner />}
            </div>
            <p className="mt-1 text-xs opacity-70">Claim accrued farming rewards.</p>
          </button>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-medium">Result</h2>
          <div className="mt-2 rounded-lg border border-white/10 bg-black/20 p-4">
            {activeAction ? (
              <p className="text-sm opacity-80">Running {activeAction}...</p>
            ) : (
              <pre className="overflow-auto text-sm leading-relaxed whitespace-pre-wrap break-words">
                {output || "No output yet."}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin opacity-70" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

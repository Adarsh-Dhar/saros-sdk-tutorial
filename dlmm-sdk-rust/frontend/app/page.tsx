"use client";
import { useCallback, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  onSwap,
  getDexName,
  getDexProgramId,
  getPoolAddresses,
  fetchPoolMetadata,
  onListenNewPoolAddress,
  onCreatePool,
  onAddLiquidity,
  onRemoveLiquidity,
} from "../lib";

type ActionKey =
  | "swap"
  | "createPool"
  | "addLiquidity"
  | "removeLiquidity"
  | "getDexName"
  | "getDexProgramId"
  | "getPools"
  | "getPoolMetadata"
  | "listenNewPool";

export default function Home() {
  const { publicKey, connected, signTransaction } = useWallet();
  const [activeAction, setActiveAction] = useState<ActionKey | null>(null);
  const [output, setOutput] = useState<string>("");

  const actions = useMemo(
    () => ({
      swap: async () =>
        await onSwap(
          publicKey,
          signTransaction
            ? {
                // Adapt wallet-adapter signature to the generic unknown signature expected by our lib
                signTransaction: async (tx: unknown) =>
                  // @ts-expect-error cross web3.js versions
                  await signTransaction(tx),
              }
            : undefined
        ),
      createPool: async () => await onCreatePool(publicKey),
      addLiquidity: async () => await onAddLiquidity(publicKey),
      removeLiquidity: async () => await onRemoveLiquidity(publicKey),
      getDexName: async () => getDexName(),
      getDexProgramId: async () => String(getDexProgramId()),
      getPools: async () => JSON.stringify(await getPoolAddresses(), null, 2),
      getPoolMetadata: async () => JSON.stringify(await fetchPoolMetadata(), null, 2),
      listenNewPool: async () => await onListenNewPoolAddress(),
    }), [publicKey, signTransaction]);

  const run = useCallback(async (key: ActionKey) => {
    setActiveAction(key);
    setOutput("");
    try {
      const res = await actions[key]();
      setOutput(typeof res === "string" ? res : JSON.stringify(res, null, 2));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setOutput(`Error: ${message}`);
    } finally {
      setActiveAction(null);
    }
  }, [actions]);

  return (
    <div className="min-h-dvh w-full px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-semibold tracking-tight">Saros DLMM Rust Implementation</h1>
        <p className="mt-2 text-sm opacity-70">Test the Rust-based AMM implementation with mock functions. Trigger any action below and inspect the response.</p>

        <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <ActionButton label="Swap" desc="Execute token swap" onClick={() => run("swap")} active={activeAction === "swap"} disabled={activeAction !== null} />
          <ActionButton label="Create Pool" desc="Initialize new pair" onClick={() => run("createPool")} active={activeAction === "createPool"} disabled={activeAction !== null} />
          <ActionButton label="Add Liquidity" desc="Deposit tokens to LP" onClick={() => run("addLiquidity")} active={activeAction === "addLiquidity"} disabled={activeAction !== null} />
          <ActionButton label="Remove Liquidity" desc="Withdraw tokens from LP" onClick={() => run("removeLiquidity")} active={activeAction === "removeLiquidity"} disabled={activeAction !== null} />
          <ActionButton label="DEX Name" desc="Read DEX name" onClick={() => run("getDexName")} active={activeAction === "getDexName"} disabled={activeAction !== null} />
          <ActionButton label="DEX Program Id" desc="Read program id" onClick={() => run("getDexProgramId")} active={activeAction === "getDexProgramId"} disabled={activeAction !== null} />
          <ActionButton label="All Pools" desc="Fetch pool addresses" onClick={() => run("getPools")} active={activeAction === "getPools"} disabled={activeAction !== null} />
          <ActionButton label="Pool Metadata" desc="Fetch pool metadata" onClick={() => run("getPoolMetadata")} active={activeAction === "getPoolMetadata"} disabled={activeAction !== null} />
          <ActionButton label="Listen Pools" desc="Listen new pool addresses" onClick={() => run("listenNewPool")} active={activeAction === "listenNewPool"} disabled={activeAction !== null} />
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-medium">Result</h2>
          <div className="mt-2 rounded-lg border border-white/10 bg-black/20 p-4">
            {!connected && !activeAction ? (
              <p className="text-sm opacity-80">Connect your wallet to run transactions.</p>
            ) : activeAction ? (
              <p className="text-sm opacity-80">Running {activeAction}...</p>
            ) : (
              <pre className="overflow-auto text-sm leading-relaxed whitespace-pre-wrap break-words">{output || "No output yet."}</pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ label, desc, onClick, active, disabled }: { label: string; desc: string; onClick: () => void; active: boolean; disabled: boolean; }) {
  return (
    <button onClick={onClick} className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10" disabled={disabled}>
      <div className="flex items-center justify-between">
        <span className="font-medium">{label}</span>
        {active && <Spinner />}
      </div>
      <p className="mt-1 text-xs opacity-70">{desc}</p>
    </button>
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

"use client";

import React, { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

export function WalletButton() {
  const { wallet, connected, disconnect, publicKey, connecting } = useWallet();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const { setVisible } = useWalletModal();

  const handleConnect = () => {
    setVisible(true);
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const getWalletIcon = () => {
    if (mounted && wallet?.adapter?.icon) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={wallet.adapter.icon}
          alt={wallet.adapter.name}
          className="h-6 w-6 rounded-full"
        />
      );
    }
    return <div className="h-6 w-6 rounded-full bg-purple-400/30" />;
  };

  const getDisplayText = () => {
    if (connecting) return "Connecting...";
    if (mounted && connected && publicKey) {
      const address = publicKey.toString();
      return `${address.slice(0, 4)}...${address.slice(-4)}`;
    }
    return "Connect Solana";
  };

  const getTooltipText = () => {
    if (connecting) return "Connecting to wallet...";
    if (mounted && connected && publicKey) return `Connected: ${publicKey.toString()}`;
    return "Click to connect Solana wallet";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-block">
            <button
              onClick={connected ? handleDisconnect : handleConnect}
              disabled={connecting}
              className={`flex items-center gap-2 rounded-md border border-gray-800 bg-black px-3 py-2 text-sm text-white transition-colors ${
                connecting ? "cursor-not-allowed opacity-50" : "hover:bg-gray-900"
              }`}
            >
              {getWalletIcon()}
              <span>{getDisplayText()}</span>
            </button>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}



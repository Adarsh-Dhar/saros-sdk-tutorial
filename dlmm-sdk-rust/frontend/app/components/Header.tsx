"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { WalletButton } from "./WalletButton";

export default function Header() {
  return (
    <header className="w-full border-b border-neutral-800/60 bg-black/40 backdrop-blur supports-[backdrop-filter]:bg-black/30">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6 md:py-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/next.svg" alt="Logo" width={28} height={28} />
          <span className="text-sm font-medium text-neutral-200">Saros DLMM Demo</span>
        </Link>

        <div className="flex items-center gap-2">
          <WalletButton />
        </div>
      </div>
    </header>
  );
}



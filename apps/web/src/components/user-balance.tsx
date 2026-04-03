"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/components/wallet-provider";

export function UserBalance() {
  const { address, isConnected, isMiniPay, connect } = useWallet();
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    // Placeholder — replace with real cUSD balance fetch via viem
    setBalance("42.50");
  }, [address]);

  if (!isConnected) {
    return (
      <div className="flex justify-center mb-8">
        {!isMiniPay && (
          <button
            onClick={connect}
            className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Connect Wallet
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex justify-center mb-8">
      <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl border border-border bg-card">
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <div className="text-left">
          <p className="text-xs text-muted-foreground font-mono">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>
          {balance && (
            <p className="text-sm font-bold">
              {balance} <span className="text-muted-foreground font-normal">cUSD</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

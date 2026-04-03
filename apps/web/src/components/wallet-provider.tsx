"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  isMiniPay: boolean;
  connect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  isConnected: false,
  isMiniPay: false,
  connect: async () => {},
});

export function useWallet() {
  return useContext(WalletContext);
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isMiniPay, setIsMiniPay] = useState(false);

  const connect = async () => {
    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum) return;
      const accounts: string[] = await ethereum.request({
        method: "eth_requestAccounts",
      });
      if (accounts[0]) setAddress(accounts[0]);
    } catch (err) {
      console.error("Wallet connect error:", err);
    }
  };

  useEffect(() => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;

    // Auto-connect if MiniPay
    if (ethereum.isMiniPay) {
      setIsMiniPay(true);
      connect();
    }

    // Listen for account changes
    ethereum.on("accountsChanged", (accounts: string[]) => {
      setAddress(accounts[0] ?? null);
    });
  }, []);

  // Update navbar wallet display
  useEffect(() => {
    const el = document.getElementById("wallet-display");
    if (el) {
      el.textContent = address
        ? address.slice(0, 6) + "..." + address.slice(-4)
        : "Not connected";
    }
  }, [address]);

  return (
    <WalletContext.Provider
      value={{ address, isConnected: !!address, isMiniPay, connect }}
    >
      {children}
    </WalletContext.Provider>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Tab } from "@/types/predict";
import { usePredictEarn } from "@/hooks/usePredictEarn";
import { useWallet } from "@/components/wallet-provider";
import { MatchCard } from "@/components/predict/MatchCard";
import { BetPanel } from "@/components/predict/BetPanel";
import { MyBets } from "@/components/predict/MyBets";
import { Leaderboard } from "@/components/predict/Leaderboard";

export function PredictEarnApp() {
  const [tab,       setTab]       = useState<Tab>("predict");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mounted,   setMounted]   = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  const { address, isConnected, isMiniPay, connect } = useWallet();

  const {
    matches, bets, mode, leverage, balance,
    selectedMatch, selectedOutcome, selectedOdd,
    stake, stakeNum, collateral, maxPayout, totalPool,
    loading, betsLoading, placing, error, betError,
    canBet, selectionLabel, isContractDeployed,
    setStake, setLeverage,
    loadLive, selectOutcome, changeMode, placeBet,
    claimBetWinnings, claimBetRefund,
  } = usePredictEarn();

  const handleSelectOutcome = (
    match: Parameters<typeof selectOutcome>[0],
    outcome: Parameters<typeof selectOutcome>[1],
    odd: Parameters<typeof selectOutcome>[2]
  ) => {
    selectOutcome(match, outcome, odd);
    setSheetOpen(true);
  };

  return (
    <div className="max-w-sm mx-auto px-4 pb-24">

      {/* Wallet connect banner */}
      {!isConnected && !isMiniPay && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 mt-4 mb-2 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold mb-0.5">Connect Wallet</p>
            <p className="text-xs text-muted-foreground">Required to place bets</p>
          </div>
          <button
            onClick={connect}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity shrink-0 ml-3"
          >
            Connect
          </button>
        </div>
      )}

      {/* Balance strip */}
      <div className="rounded-2xl border border-border bg-card px-5 py-4 flex items-center justify-between mb-4 mt-4">
        <div>
          <p className="text-[11px] tracking-widest text-muted-foreground uppercase mb-1">
            Balance
          </p>
          {isConnected ? (
            <p className="text-2xl font-bold tracking-tight">
              {balance.toFixed(2)}{" "}
              <span className="text-sm font-normal text-muted-foreground">cUSD</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-sm"
            aria-label="Toggle theme"
          >
            {mounted ? (theme === "dark" ? "☀️" : "🌙") : null}
          </button>
          <div className="text-right">
            <p className="text-[11px] tracking-widest text-muted-foreground uppercase mb-1">
              Pool
            </p>
            <p className="text-lg font-bold text-primary">${totalPool.toFixed(0)}</p>
          </div>
        </div>
      </div>

      {/* Contract not deployed warning */}
      {!isContractDeployed && (
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-2.5 mb-4 flex items-center gap-2">
          <span className="text-yellow-400">⚠️</span>
          <p className="text-xs text-yellow-400">
            Contract not deployed — set <code className="font-mono">NEXT_PUBLIC_CONTRACT_ADDRESS</code> in .env.local
          </p>
        </div>
      )}

      {/* Mode toggle */}
      <div className="rounded-xl border border-border bg-card p-1 grid grid-cols-2 gap-1 mb-6">
        {(["standard", "leverage"] as const).map((m) => (
          <button
            key={m}
            onClick={() => changeMode(m)}
            className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
              mode === m
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "leverage" ? "⚡ Leverage Mode" : "Standard Pool"}
          </button>
        ))}
      </div>

      {/* ── PREDICT TAB ── */}
      {tab === "predict" && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] tracking-widest text-muted-foreground uppercase">Live Matches</p>
            {!loading && (
              <button onClick={loadLive} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors font-mono">
                ↻ Refresh
              </button>
            )}
          </div>

          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-border bg-card px-4 py-6 animate-pulse">
                  <div className="flex justify-between mb-4">
                    <div className="h-3 w-24 bg-muted rounded" />
                    <div className="h-3 w-16 bg-muted rounded" />
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="h-4 w-28 bg-muted rounded" />
                    <div className="h-4 w-8 bg-muted rounded" />
                    <div className="h-4 w-28 bg-muted rounded" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[1,2,3].map((j) => <div key={j} className="h-12 bg-muted rounded-xl" />)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-6 text-center">
              <p className="text-2xl mb-3">⚠️</p>
              <p className="text-sm font-semibold text-red-400 mb-1">Failed to load matches</p>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{error}</p>
              <button onClick={loadLive} className="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && matches.length === 0 && (
            <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center">
              <p className="text-3xl mb-3">⚽</p>
              <p className="text-sm font-semibold mb-1">No matches right now</p>
              <p className="text-xs text-muted-foreground mb-4">Check back soon.</p>
              <button onClick={loadLive} className="px-5 py-2 rounded-xl text-xs font-bold border border-border text-muted-foreground hover:text-foreground transition-colors">
                Refresh
              </button>
            </div>
          )}

          {!loading && !error && matches.length > 0 && (
            <div className="space-y-3">
              {matches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  selectedOutcome={selectedMatch?.id === match.id ? selectedOutcome : null}
                  isSelected={selectedMatch?.id === match.id && sheetOpen}
                  onSelect={handleSelectOutcome}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── MY BETS TAB ── */}
      {tab === "bets" && (
        <>
          <p className="text-[11px] tracking-widest text-muted-foreground uppercase mb-3">My Predictions</p>

          {betError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 mb-3">
              <p className="text-xs text-red-400">{betError}</p>
            </div>
          )}

          {!isConnected ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              Connect your wallet to see your bets.
            </div>
          ) : (
            <MyBets
              bets={bets}
              loading={betsLoading}
              txPending={placing}
              onClaim={claimBetWinnings}
              onRefund={claimBetRefund}
            />
          )}
        </>
      )}

      {/* ── LEADERS TAB ── */}
      {tab === "leaders" && (
        <>
          <p className="text-[11px] tracking-widest text-muted-foreground uppercase mb-3">Top Predictors</p>
          <Leaderboard />
        </>
      )}

      {/* Bet panel */}
      <BetPanel
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        mode={mode}
        leverage={leverage}
        stake={stake}
        stakeNum={stakeNum}
        collateral={collateral}
        maxPayout={maxPayout}
        selectedOdd={selectedOdd}
        selectionLabel={selectionLabel}
        balance={balance}
        canBet={canBet}
        onStakeChange={setStake}
        onLeverageChange={setLeverage}
        onPlace={async () => {
          await placeBet();
          // Only close if no error
          if (!betError) setSheetOpen(false);
        }}
      />

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-background flex max-w-sm mx-auto z-30">
        {(
          [
            { key: "predict", icon: "⚽", label: "Predict"  },
            { key: "bets",    icon: "📋", label: "My Bets"  },
            { key: "leaders", icon: "🏆", label: "Leaders"  },
          ] as const
        ).map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-3 flex flex-col items-center gap-1 text-[10px] font-semibold tracking-widest uppercase transition-colors ${
              tab === key ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <span className="text-lg">{icon}</span>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
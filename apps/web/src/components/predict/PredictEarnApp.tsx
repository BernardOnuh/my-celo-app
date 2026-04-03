"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Tab } from "@/types/predict";
import { usePredictEarn } from "@/hooks/usePredictEarn";
import { MatchCard } from "@/components/predict/MatchCard";
import { BetPanel } from "@/components/predict/BetPanel";
import { MyBets } from "@/components/predict/MyBets";
import { Leaderboard } from "@/components/predict/Leaderboard";

export function PredictEarnApp() {
  const [tab, setTab] = useState<Tab>("predict");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  const {
    matches, bets, mode, leverage, balance,
    selectedMatch, selectedOutcome, selectedOdd,
    stake, stakeNum, collateral, maxPayout, totalPool,
    loading, error, apiKey, canBet, selectionLabel,
    setStake, setApiKey, setLeverage,
    loadMock, loadLive, selectOutcome, changeMode, placeBet,
  } = usePredictEarn();

  const handleSelectOutcome = (
    match: Parameters<typeof selectOutcome>[0],
    outcome: Parameters<typeof selectOutcome>[1],
    odd: Parameters<typeof selectOutcome>[2]
  ) => {
    selectOutcome(match, outcome, odd);
    setSheetOpen(true);
  };

  const handleClose = () => setSheetOpen(false);

  const handlePlace = () => {
    placeBet();
    setSheetOpen(false);
  };

  return (
    <div className="max-w-sm mx-auto px-4 pb-24">

      {/* Balance strip */}
      <div className="rounded-2xl border border-border bg-card px-5 py-4 flex items-center justify-between mb-4 mt-4">
        <div>
          <p className="text-[11px] tracking-widest text-muted-foreground uppercase mb-1">
            Your Balance
          </p>
          <p className="text-2xl font-bold tracking-tight">
            {balance.toFixed(2)}{" "}
            <span className="text-sm font-normal text-muted-foreground">cUSD</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-sm"
            aria-label="Toggle theme"
          >
            {mounted ? (theme === "dark" ? "☀️" : "🌙") : null}
          </button>
          <div className="text-right">
            <p className="text-[11px] tracking-widest text-muted-foreground uppercase mb-1">
              Live Pool
            </p>
            <p className="text-lg font-bold text-primary">${totalPool.toFixed(2)}</p>
          </div>
        </div>
      </div>

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

      {/* PREDICT TAB */}
      {tab === "predict" && (
        <>
          <p className="text-[11px] tracking-widest text-muted-foreground uppercase mb-3">
            Live Matches
          </p>

          {/* API Key panel */}
          {!matches.length && (
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 mb-4">
              <p className="text-xs text-blue-400 mb-3 leading-relaxed">
                Enter your <strong>The Odds API</strong> key to load real odds,
                or use demo data.
              </p>
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste API key here..."
                className="w-full rounded-lg px-3 py-2 text-xs font-mono border border-border outline-none focus:border-blue-400 transition-colors bg-background text-foreground mb-2"
              />
              {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={loadLive}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-primary text-primary-foreground disabled:opacity-50 transition-opacity"
                >
                  {loading ? "Loading..." : "Load Live Odds"}
                </button>
                <button
                  onClick={loadMock}
                  className="px-4 py-2 rounded-lg text-xs font-bold border border-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  Use Demo Data
                </button>
              </div>
            </div>
          )}

          {/* Match cards */}
          <div className="space-y-3">
            {matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                selectedOutcome={
                  selectedMatch?.id === match.id ? selectedOutcome : null
                }
                isSelected={selectedMatch?.id === match.id && sheetOpen}
                onSelect={handleSelectOutcome}
              />
            ))}
          </div>
        </>
      )}

      {/* MY BETS TAB */}
      {tab === "bets" && (
        <>
          <p className="text-[11px] tracking-widest text-muted-foreground uppercase mb-3">
            My Predictions
          </p>
          <MyBets bets={bets} />
        </>
      )}

      {/* LEADERS TAB */}
      {tab === "leaders" && (
        <>
          <p className="text-[11px] tracking-widest text-muted-foreground uppercase mb-3">
            Top Predictors
          </p>
          <Leaderboard />
        </>
      )}

      {/* Bottom sheet */}
      <BetPanel
        isOpen={sheetOpen}
        onClose={handleClose}
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
        onPlace={handlePlace}
      />

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-background flex max-w-sm mx-auto z-30">
        {(
          [
            { key: "predict", icon: "⚽", label: "Predict" },
            { key: "bets", icon: "📋", label: "My Bets" },
            { key: "leaders", icon: "🏆", label: "Leaders" },
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
"use client";

import { useEffect, useRef } from "react";
import { Mode } from "@/types/predict";

const LEVERAGE_OPTIONS = [1, 2, 5, 10, 25, 100];
const QUICK_STAKES = [1, 5, 10, 25];

interface Props {
  mode: Mode;
  leverage: number;
  stake: string;
  stakeNum: number;
  collateral: number;
  maxPayout: number;
  selectedOdd: number | null;
  selectionLabel: string;
  balance: number;
  canBet: boolean;
  isOpen: boolean;
  onClose: () => void;
  onStakeChange: (val: string) => void;
  onLeverageChange: (val: number) => void;
  onPlace: () => void;
}

export function BetPanel({
  mode, leverage, stake, stakeNum, collateral, maxPayout,
  selectedOdd, selectionLabel, balance, canBet, isOpen, onClose,
  onStakeChange, onLeverageChange, onPlace,
}: Props) {
  const isInsufficient = stakeNum > 0 && collateral > balance;
  const sheetRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Close on backdrop tap
  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const rows = [
    { key: "Stake", val: `$${stakeNum.toFixed(2)} cUSD`, cls: "text-foreground" },
    { key: "Collateral locked", val: `$${collateral.toFixed(2)} cUSD`, cls: "text-red-400" },
    { key: "Odds", val: selectedOdd ? `${selectedOdd}x` : "—", cls: "text-foreground" },
    ...(mode === "leverage"
      ? [{ key: "Leverage", val: `${leverage}x`, cls: "text-yellow-400" }]
      : []),
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleBackdrop}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        }}
      />

      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-50 max-w-sm mx-auto"
        style={{
          transform: isOpen ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <div className="rounded-t-3xl border border-border border-b-0 bg-background"
          style={{ boxShadow: "0 -8px 40px rgba(0,0,0,0.4)" }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3">
            <p className="text-base font-bold">Place Prediction</p>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>

          <div className="px-5 pb-8 space-y-4 overflow-y-auto max-h-[75vh]">

            {/* Selection pill */}
            <div className="flex items-center justify-between rounded-2xl px-4 py-3 bg-primary/10 border border-primary/20">
              <span className="text-xs text-muted-foreground font-medium">Your pick</span>
              <span className="text-sm font-bold text-primary">{selectionLabel || "—"}</span>
            </div>

            {/* Stake input */}
            <div>
              <p className="text-[11px] tracking-widest text-muted-foreground uppercase mb-2">
                Stake Amount
              </p>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={stake}
                  onChange={(e) => onStakeChange(e.target.value)}
                  placeholder="0.00"
                  min={0.5}
                  step={0.5}
                  autoFocus={isOpen}
                  className="flex-1 rounded-2xl px-4 py-3.5 text-xl font-mono font-semibold outline-none border border-border focus:border-primary transition-colors bg-muted/30 text-foreground"
                />
                <div className="rounded-2xl px-4 flex items-center text-sm font-bold text-primary border border-border bg-muted/30">
                  cUSD
                </div>
              </div>

              {/* Quick stakes */}
              <div className="flex gap-2 mt-3 flex-wrap">
                {QUICK_STAKES.map((q) => (
                  <button
                    key={q}
                    onClick={() => onStakeChange(String(q))}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                      stakeNum === q
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground bg-muted/30"
                    }`}
                  >
                    ${q}
                  </button>
                ))}
              </div>
            </div>

            {/* Leverage selector */}
            {mode === "leverage" && (
              <div>
                <p className="text-[11px] tracking-widest text-muted-foreground uppercase mb-2">
                  Leverage Multiplier
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {LEVERAGE_OPTIONS.map((lv) => (
                    <button
                      key={lv}
                      onClick={() => onLeverageChange(lv)}
                      className={`py-2.5 rounded-xl text-sm font-mono font-semibold border transition-all ${
                        leverage === lv
                          ? "border-yellow-500 bg-yellow-500/10 text-yellow-400"
                          : "border-border text-muted-foreground hover:border-border/60 bg-muted/30"
                      }`}
                    >
                      {lv}x
                    </button>
                  ))}
                </div>
                {leverage > 1 && (
                  <p className="text-xs text-yellow-500/80 mt-2 leading-relaxed">
                    ⚠️ {leverage}x leverage locks ${collateral.toFixed(2)} cUSD collateral.
                    You lose it all if incorrect.
                  </p>
                )}
              </div>
            )}

            {/* Payout breakdown */}
            <div className="rounded-2xl bg-muted/30 border border-border p-4 space-y-2.5">
              {rows.map(({ key, val, cls }) => (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{key}</span>
                  <span className={`font-mono text-sm font-medium ${cls}`}>{val}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2.5 border-t border-border">
                <span className="text-xs text-muted-foreground">Max payout if correct</span>
                <span className="font-mono text-lg font-bold text-primary">
                  ${maxPayout.toFixed(2)}
                </span>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={() => { onPlace(); onClose(); }}
              disabled={!canBet || isInsufficient}
              className={`w-full py-4 rounded-2xl text-sm font-bold tracking-wide transition-all active:scale-[0.98] ${
                canBet && !isInsufficient
                  ? "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              {isInsufficient
                ? "Insufficient Balance"
                : !selectionLabel
                ? "Select an Outcome First"
                : mode === "leverage"
                ? `⚡ Confirm ${leverage}x Leveraged Bet`
                : "Confirm Prediction ✓"}
            </button>

          </div>
        </div>
      </div>
    </>
  );
}

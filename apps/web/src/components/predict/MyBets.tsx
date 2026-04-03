"use client";

import { Bet } from "@/types/predict";

const STATUS_STYLES = {
  pending: "bg-yellow-500/10 text-yellow-500",
  won: "bg-green-500/10 text-green-500",
  lost: "bg-red-500/10 text-red-500",
};

export function MyBets({ bets }: { bets: Bet[] }) {
  if (!bets.length) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        No predictions yet.
        <br />
        Go place your first bet!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bets.map((bet) => (
        <div
          key={bet.id}
          className="rounded-2xl border border-border bg-card px-4 py-3.5 flex items-start justify-between gap-3"
        >
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm mb-1 truncate">{bet.match}</p>
            <p className="text-xs font-mono text-muted-foreground mb-0.5">{bet.selection}</p>
            {bet.leverage > 1 && (
              <p className="text-xs text-yellow-400 font-mono">⚡ {bet.leverage}x leverage</p>
            )}
            <p className="text-xs font-mono text-muted-foreground/60 mt-1">
              Locked: ${bet.collateral.toFixed(2)} cUSD
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className={`text-[10px] font-bold px-2 py-1 rounded-md block mb-1.5 ${STATUS_STYLES[bet.status]}`}>
              {bet.status.toUpperCase()}
            </span>
            <p className="font-mono text-sm font-medium text-primary">
              → ${bet.maxPayout.toFixed(2)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

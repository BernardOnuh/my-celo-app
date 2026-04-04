"use client";

import { ChainBet } from "@/hooks/useContract";

const STATUS_STYLES = {
  pending: "bg-yellow-500/10 text-yellow-500",
  won:     "bg-green-500/10  text-green-500",
  lost:    "bg-red-500/10    text-red-500",
};

interface Props {
  bets:      ChainBet[];
  loading:   boolean;
  txPending: boolean;
  onClaim:   (betIndex: number) => void;
  onRefund:  (betIndex: number) => void;
}

export function MyBets({ bets, loading, txPending, onClaim, onRefund }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-card px-4 py-5 animate-pulse">
            <div className="h-3 w-40 bg-muted rounded mb-3" />
            <div className="h-3 w-24 bg-muted rounded mb-2" />
            <div className="h-3 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

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
      {bets.map((bet) => {
        const canClaim  = bet.status === "won"  && !bet.claimed;
        const canRefund = bet.isCancelled        && !bet.claimed;

        return (
          <div
            key={bet.id}
            className="rounded-2xl border border-border bg-card px-4 py-3.5"
          >
            <div className="flex items-start justify-between gap-3">
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
                  {bet.claimed ? "CLAIMED" : bet.status.toUpperCase()}
                </span>
                <p className="font-mono text-sm font-medium text-primary">
                  → ${bet.maxPayout.toFixed(2)}
                </p>
              </div>
            </div>

            {(canClaim || canRefund) && (
              <button
                onClick={() => canClaim ? onClaim(bet.betIndex) : onRefund(bet.betIndex)}
                disabled={txPending}
                className={`mt-3 w-full py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all active:scale-[0.98] ${
                  txPending
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : canClaim
                    ? "bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20"
                    : "bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20"
                }`}
              >
                {txPending
                  ? "Processing..."
                  : canClaim
                  ? `🏆 Claim $${bet.maxPayout.toFixed(2)} cUSD`
                  : "↩ Claim Refund"}
              </button>
            )}

            {bet.claimed && (
              <p className="mt-2 text-[10px] text-center text-muted-foreground font-mono">
                ✓ Paid out
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
"use client";

import { Match, Outcome } from "@/types/predict";
import {
  formatMatchTime,
  formatMatchDate,
  getTimeUntil,
  getBettingDeadline,
  isUrgent,
} from "@/lib/odds";

interface Props {
  match: Match;
  selectedOutcome: Outcome | null;
  isSelected: boolean;
  onSelect: (match: Match, outcome: Outcome, odd: number) => void;
}

const OUTCOME_STYLES: Record<Outcome, string> = {
  home: "border-blue-500 bg-blue-500/10 text-blue-400",
  draw: "border-yellow-500 bg-yellow-500/10 text-yellow-400",
  away: "border-red-500 bg-red-500/10 text-red-400",
};

export function MatchCard({ match, selectedOutcome, isSelected, onSelect }: Props) {
  const {
    home, homeShort, away, awayShort,
    homeOdd, drawOdd, awayOdd,
    pool, league, leagueCountry, isLive,
    commenceTime, venue,
  } = match;

  const total = pool.home + pool.draw + pool.away;
  const urgent = !isLive && isUrgent(commenceTime);
  const deadline = getBettingDeadline(commenceTime);
  const bettingClosed = deadline === "Closed";

  const odds = [
    { label: "1", sublabel: home.split(" ").pop()!, odd: homeOdd, outcome: "home" as Outcome },
    { label: "X", sublabel: "Draw", odd: drawOdd, outcome: "draw" as Outcome },
    { label: "2", sublabel: away.split(" ").pop()!, odd: awayOdd, outcome: "away" as Outcome },
  ];

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        bettingClosed
          ? "border-border/30 opacity-60"
          : isSelected
          ? "border-primary shadow-sm shadow-primary/10"
          : "border-border hover:border-border/60"
      }`}
      style={{ background: "hsl(var(--card))" }}
    >
      {/* ── Top bar: league + status ── */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base leading-none">{leagueCountry}</span>
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground">
            {league}
          </span>
        </div>

        {isLive ? (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-bold text-red-400 tracking-wider">LIVE</span>
          </div>
        ) : urgent ? (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20">
            <span className="text-[10px] font-bold text-yellow-400">
              ⚡ {getTimeUntil(commenceTime)}
            </span>
          </div>
        ) : (
          <span className="text-[11px] font-mono text-muted-foreground">
            {formatMatchDate(commenceTime)}
          </span>
        )}
      </div>

      {/* ── Teams + time ── */}
      <div className="px-4 pb-3">
        {/* Team names row */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mb-2">
          <div>
            <p className="font-bold text-sm leading-tight">{home}</p>
            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{homeShort}</p>
          </div>
          <div className="text-center px-2">
            {isLive ? (
              <div className="bg-muted/50 rounded-lg px-2 py-1">
                <p className="text-xs font-bold font-mono">0 - 0</p>
                <p className="text-[9px] text-red-400 font-mono">45'</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-base font-bold text-muted-foreground">VS</p>
                <p className="text-[11px] font-mono font-semibold text-foreground">
                  {formatMatchTime(commenceTime)}
                </p>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="font-bold text-sm leading-tight">{away}</p>
            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{awayShort}</p>
          </div>
        </div>

        {/* Venue */}
        {venue && (
          <p className="text-[10px] text-muted-foreground/60 text-center mb-0.5">
            📍 {venue}
          </p>
        )}
      </div>

      {/* ── Divider ── */}
      <div className="mx-4 border-t border-border/50" />

      {/* ── Odds buttons ── */}
      <div className="grid grid-cols-3 gap-1.5 p-3">
        {odds.map(({ label, sublabel, odd, outcome }) => {
          const active = isSelected && selectedOutcome === outcome;
          return (
            <button
              key={outcome}
              onClick={() => !bettingClosed && onSelect(match, outcome, odd)}
              disabled={bettingClosed}
              className={`py-2.5 rounded-xl border text-center transition-all duration-150 ${
                active
                  ? OUTCOME_STYLES[outcome]
                  : bettingClosed
                  ? "border-border/30 bg-muted/10 cursor-not-allowed"
                  : "border-border bg-muted/30 hover:border-border/60 active:scale-95"
              }`}
            >
              <p className="text-[10px] text-muted-foreground tracking-widest font-mono mb-0.5">
                {label}
              </p>
              <p className={`text-base font-bold ${active ? "" : "text-foreground"}`}>{odd}</p>
              <p className="text-[9px] text-muted-foreground/60 truncate px-1">{sublabel}</p>
            </button>
          );
        })}
      </div>

      {/* ── Pool bar ── */}
      <div className="mx-3 mb-1 h-1 rounded-full overflow-hidden flex bg-muted/30">
        <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${(pool.home / total) * 100}%` }} />
        <div className="h-full bg-yellow-500 transition-all duration-500" style={{ width: `${(pool.draw / total) * 100}%` }} />
        <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${(pool.away / total) * 100}%` }} />
      </div>

      {/* ── Pool stats + deadline ── */}
      <div className="flex items-center justify-between px-3 pb-3 pt-1">
        <div className="flex gap-3 text-[10px] font-mono">
          <span className="text-blue-400">{Math.round((pool.home / total) * 100)}%</span>
          <span className="text-yellow-400">{Math.round((pool.draw / total) * 100)}%</span>
          <span className="text-red-400">{Math.round((pool.away / total) * 100)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground">
            💰 ${pool.totalUSD.toLocaleString()}
          </span>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              bettingClosed
                ? "bg-red-500/10 text-red-400"
                : urgent
                ? "bg-yellow-500/10 text-yellow-400"
                : "bg-muted/50 text-muted-foreground"
            }`}
          >
            {isLive ? "Betting closed" : deadline}
          </span>
        </div>
      </div>
    </div>
  );
}

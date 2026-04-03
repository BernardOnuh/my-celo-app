export type Outcome = "home" | "draw" | "away";
export type Mode = "standard" | "leverage";
export type Tab = "predict" | "bets" | "leaders";

export interface Match {
  id: string;
  league: string;
  leagueCountry: string;
  isLive: boolean;
  home: string;
  homeShort: string;
  away: string;
  awayShort: string;
  homeOdd: number;
  drawOdd: number;
  awayOdd: number;
  commenceTime: string;      // ISO string from API
  bettingDeadline: string;   // ISO string — usually same as commenceTime
  venue?: string;
  pool: {
    home: number;
    draw: number;
    away: number;
    totalUSD: number;        // total cUSD in pool
  };
}

export interface Bet {
  id: string;
  matchId: string;
  match: string;
  selection: string;
  outcome: Outcome;
  stake: number;
  collateral: number;
  leverage: number;
  odd: number;
  maxPayout: number;
  status: "pending" | "won" | "lost";
  placedAt: Date;
  matchTime: string;
}

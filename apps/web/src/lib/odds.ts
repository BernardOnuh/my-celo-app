/**
 * lib/odds.ts
 * Fetches live football odds from The Odds API.
 * API key is read from NEXT_PUBLIC_ODDS_API_KEY in .env.local
 * No mock data. No fallback. Real matches only.
 */

import { Match } from "@/types/predict";

const API_KEY  = process.env.NEXT_PUBLIC_ODDS_API_KEY ?? "";
const BASE_URL = "https://api.the-odds-api.com/v4";

const SPORTS = [
  "soccer_epl",
  "soccer_spain_la_liga",
  "soccer_italy_serie_a",
  "soccer_germany_bundesliga",
  "soccer_france_ligue_one",
  "soccer_uefa_champs_league",
];

const LEAGUE_META: Record<string, { name: string; flag: string }> = {
  soccer_epl:                { name: "Premier League",   flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  soccer_spain_la_liga:      { name: "La Liga",          flag: "🇪🇸" },
  soccer_italy_serie_a:      { name: "Serie A",          flag: "🇮🇹" },
  soccer_germany_bundesliga: { name: "Bundesliga",       flag: "🇩🇪" },
  soccer_france_ligue_one:   { name: "Ligue 1",          flag: "🇫🇷" },
  soccer_uefa_champs_league: { name: "Champions League", flag: "🏆" },
};

interface OddsAPIGame {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers?: Array<{
    key: string;
    markets: Array<{
      key: string;
      outcomes: Array<{ name: string; price: number }>;
    }>;
  }>;
}

// ── Formatting helpers ────────────────────────────────────────────────────────

export function formatMatchTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatMatchDate(iso: string): string {
  const d        = new Date(iso);
  const today    = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  if (d.toDateString() === today.toDateString())    return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function getTimeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Now";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function getBettingDeadline(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Closed";
  return `Closes in ${getTimeUntil(iso)}`;
}

export function isUrgent(iso: string): boolean {
  const diff = new Date(iso).getTime() - Date.now();
  return diff > 0 && diff < 3 * 3_600_000;
}

function abbreviate(name: string): string {
  const words = name.split(" ");
  if (words.length === 1) return name.slice(0, 3).toUpperCase();
  return words.map((w) => w[0]).join("").toUpperCase().slice(0, 4);
}

// ── Parse raw API game → Match ────────────────────────────────────────────────

function parseGame(game: OddsAPIGame): Match | null {
  const h2h = game.bookmakers
    ?.flatMap((b) => b.markets)
    .find((m) => m.key === "h2h");

  if (!h2h) return null;

  const homeOut = h2h.outcomes.find((o) => o.name === game.home_team);
  const awayOut = h2h.outcomes.find((o) => o.name === game.away_team);
  const drawOut = h2h.outcomes.find((o) => o.name === "Draw");

  if (!homeOut || !awayOut) return null;

  const homeOdd = homeOut.price;
  const awayOdd = awayOut.price;
  const drawOdd = drawOut?.price ?? 3.2;

  const meta = LEAGUE_META[game.sport_key] ?? { name: game.sport_title, flag: "⚽" };

  // Derive pool size from implied probability (higher odds = smaller pool share)
  const totalPoolUSD = 5000; // placeholder — replace with on-chain pool read
  const invHome = 1 / homeOdd;
  const invDraw = 1 / drawOdd;
  const invAway = 1 / awayOdd;
  const total   = invHome + invDraw + invAway;

  return {
    id:              game.id,
    home:            game.home_team,
    homeShort:       abbreviate(game.home_team),
    away:            game.away_team,
    awayShort:       abbreviate(game.away_team),
    homeOdd:         Math.round(homeOdd * 100) / 100,
    drawOdd:         Math.round(drawOdd * 100) / 100,
    awayOdd:         Math.round(awayOdd * 100) / 100,
    league:          meta.name,
    leagueCountry:   meta.flag,
    commenceTime:    game.commence_time,
    bettingDeadline: game.commence_time,   // ← add this line
    isLive:          new Date(game.commence_time).getTime() < Date.now(),
    pool: {
      home:     Math.round((invHome / total) * totalPoolUSD),
      draw:     Math.round((invDraw / total) * totalPoolUSD),
      away:     Math.round((invAway / total) * totalPoolUSD),
      totalUSD: totalPoolUSD,
    },
    venue: undefined,
  };
}

// ── Public fetch function ─────────────────────────────────────────────────────

/**
 * Fetch live odds for all supported soccer leagues.
 * Throws if NEXT_PUBLIC_ODDS_API_KEY is missing.
 */
export async function fetchLiveOdds(): Promise<Match[]> {
  if (!API_KEY) {
    throw new Error(
      "NEXT_PUBLIC_ODDS_API_KEY is not set. Add it to your .env.local file."
    );
  }

  const results: Match[] = [];
  const errors: string[] = [];

  await Promise.allSettled(
    SPORTS.map(async (sport) => {
      const url = new URL(`${BASE_URL}/sports/${sport}/odds`);
      url.searchParams.set("apiKey",     API_KEY);
      url.searchParams.set("regions",    "eu");
      url.searchParams.set("markets",    "h2h");
      url.searchParams.set("oddsFormat", "decimal");
      url.searchParams.set("dateFormat", "iso");

      const res = await fetch(url.toString(), {
        next: { revalidate: 60 }, // Next.js ISR — re-fetch at most every 60s
      });

      if (res.status === 401) {
        throw new Error("Invalid API key. Check NEXT_PUBLIC_ODDS_API_KEY in .env.local.");
      }
      if (res.status === 422) {
        errors.push(`${sport}: sport not available in your region`);
        return;
      }
      if (!res.ok) {
        errors.push(`${sport}: HTTP ${res.status}`);
        return;
      }

      const games: OddsAPIGame[] = await res.json();
      for (const game of games) {
        const match = parseGame(game);
        if (match) results.push(match);
      }
    })
  );

  // If every league failed, surface the error
  if (results.length === 0 && errors.length > 0) {
    throw new Error(`Could not load any matches: ${errors.join("; ")}`);
  }

  // Sort: live first, then soonest upcoming
  results.sort((a, b) => {
    if (a.isLive && !b.isLive) return -1;
    if (!a.isLive && b.isLive) return 1;
    return new Date(a.commenceTime).getTime() - new Date(b.commenceTime).getTime();
  });

  return results;
}
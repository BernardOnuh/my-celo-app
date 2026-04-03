import { Match } from "@/types/predict";

// ── Time helpers ────────────────────────────────────────────────

export function formatMatchTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatMatchDate(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function getTimeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Started";
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ${hrs % 24}h`;
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  return `${mins}m`;
}

export function getBettingDeadline(iso: string): string {
  // Betting closes 5 mins before kickoff
  const deadline = new Date(new Date(iso).getTime() - 5 * 60 * 1000);
  const diff = deadline.getTime() - Date.now();
  if (diff <= 0) return "Closed";
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `Closes in ${hrs}h ${mins % 60}m`;
  return `Closes in ${mins}m`;
}

export function isUrgent(iso: string): boolean {
  const diff = new Date(iso).getTime() - Date.now();
  return diff > 0 && diff < 30 * 60 * 1000; // under 30 mins
}

// ── Mock data ────────────────────────────────────────────────────

function future(hoursFromNow: number): string {
  return new Date(Date.now() + hoursFromNow * 3600 * 1000).toISOString();
}

export const MOCK_MATCHES: Match[] = [
  {
    id: "m1",
    league: "Premier League",
    leagueCountry: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    isLive: true,
    home: "Arsenal",
    homeShort: "ARS",
    away: "Chelsea",
    awayShort: "CHE",
    homeOdd: 2.1,
    drawOdd: 3.4,
    awayOdd: 3.2,
    commenceTime: future(-0.5),   // started 30m ago
    bettingDeadline: future(-0.6),
    venue: "Emirates Stadium",
    pool: { home: 58, draw: 22, away: 20, totalUSD: 1240 },
  },
  {
    id: "m2",
    league: "Premier League",
    leagueCountry: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    isLive: false,
    home: "Man City",
    homeShort: "MCI",
    away: "Liverpool",
    awayShort: "LIV",
    homeOdd: 1.95,
    drawOdd: 3.6,
    awayOdd: 3.8,
    commenceTime: future(1.5),
    bettingDeadline: future(1.4),
    venue: "Etihad Stadium",
    pool: { home: 51, draw: 19, away: 30, totalUSD: 3870 },
  },
  {
    id: "m3",
    league: "La Liga",
    leagueCountry: "🇪🇸",
    isLive: false,
    home: "Barcelona",
    homeShort: "BAR",
    away: "Real Madrid",
    awayShort: "RMA",
    homeOdd: 2.6,
    drawOdd: 3.1,
    awayOdd: 2.8,
    commenceTime: future(3),
    bettingDeadline: future(2.9),
    venue: "Spotify Camp Nou",
    pool: { home: 44, draw: 18, away: 38, totalUSD: 5120 },
  },
  {
    id: "m4",
    league: "NPFL",
    leagueCountry: "🇳🇬",
    isLive: false,
    home: "Enyimba FC",
    homeShort: "ENY",
    away: "Rangers Intl",
    awayShort: "RAN",
    homeOdd: 1.9,
    drawOdd: 3.2,
    awayOdd: 4.1,
    commenceTime: future(0.4),   // 24 mins away — urgent
    bettingDeadline: future(0.3),
    venue: "Enyimba International Stadium",
    pool: { home: 62, draw: 20, away: 18, totalUSD: 340 },
  },
  {
    id: "m5",
    league: "CAF Champions League",
    leagueCountry: "🌍",
    isLive: false,
    home: "Sundowns",
    homeShort: "SUN",
    away: "Al Ahly",
    awayShort: "AHL",
    homeOdd: 2.4,
    drawOdd: 3.3,
    awayOdd: 2.9,
    commenceTime: future(24),
    bettingDeadline: future(23.9),
    venue: "Loftus Versfeld",
    pool: { home: 35, draw: 25, away: 40, totalUSD: 890 },
  },
];

// ── Live API fetch ────────────────────────────────────────────────

function extractOdd(game: any, team: string): number {
  try {
    const bookmaker = game.bookmakers[0];
    const market = bookmaker.markets.find((m: any) => m.key === "h2h");
    const outcome = market.outcomes.find((o: any) => o.name === team);
    return outcome ? parseFloat(outcome.price.toFixed(2)) : 3.0;
  } catch {
    return 3.0;
  }
}

export async function fetchLiveOdds(apiKey: string): Promise<Match[]> {
  const res = await fetch(
    `https://api.the-odds-api.com/v4/sports/soccer_epl/odds/?apiKey=${apiKey}&regions=uk&markets=h2h&oddsFormat=decimal`
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || "Invalid API key or quota exceeded");
  }

  const data = await res.json();

  return data.slice(0, 6).map((game: any): Match => {
    const homePool = 30 + Math.floor(Math.random() * 30);
    const drawPool = 15 + Math.floor(Math.random() * 15);
    const awayPool = 100 - homePool - drawPool;
    const totalUSD = 200 + Math.floor(Math.random() * 4000);

    return {
      id: game.id,
      league: "Premier League",
      leagueCountry: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
      isLive: false,
      home: game.home_team,
      homeShort: game.home_team.slice(0, 3).toUpperCase(),
      away: game.away_team,
      awayShort: game.away_team.slice(0, 3).toUpperCase(),
      homeOdd: extractOdd(game, game.home_team),
      drawOdd: extractOdd(game, "Draw"),
      awayOdd: extractOdd(game, game.away_team),
      commenceTime: game.commence_time,
      bettingDeadline: game.commence_time,
      pool: { home: homePool, draw: drawPool, away: awayPool, totalUSD },
    };
  });
}

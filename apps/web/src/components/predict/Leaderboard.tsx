"use client";

const LEADERS = [
  { addr: "0x9a2f...1b44", wins: 14, profit: "+$128.40", streak: 5 },
  { addr: "0x3c71...9d20", wins: 11, profit: "+$94.20", streak: 3 },
  { addr: "0x4f2a...3e91", wins: 9, profit: "+$67.80", streak: 2 },
  { addr: "0x8e12...5c33", wins: 7, profit: "+$41.50", streak: 4 },
  { addr: "0x1d99...7f02", wins: 5, profit: "+$22.10", streak: 1 },
];

const RANK_COLOR = ["text-yellow-400", "text-muted-foreground", "text-orange-400"];

export function Leaderboard() {
  return (
    <div className="space-y-3">
      {LEADERS.map((p, i) => (
        <div
          key={p.addr}
          className="rounded-2xl border border-border bg-card px-4 py-3.5 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className={`font-mono text-xl font-bold w-7 ${RANK_COLOR[i] ?? "text-muted-foreground"}`}>
              #{i + 1}
            </span>
            <div>
              <p className="font-bold text-sm">{p.addr}</p>
              <p className="text-xs font-mono text-muted-foreground">
                {p.wins} wins · {p.streak} streak 🔥
              </p>
            </div>
          </div>
          <p className="font-mono text-sm font-medium text-primary">{p.profit}</p>
        </div>
      ))}
    </div>
  );
}

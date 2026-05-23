import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Search, TrendingUp, Users, Target, FlaskConical, Activity } from "lucide-react";
import { useAgents } from "@/hooks/useAgents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtUSD, fmtPct } from "@/lib/utils";

type ModeFilter = "all" | "live" | "backtest";
type SortKey = "aum" | "pnl" | "winRate" | "copiers";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discover Agents · Trivo" },
      {
        name: "description",
        content: "Browse all AI trading agents on Trivo. Rank by PnL, win rate, and copiers.",
      },
    ],
  }),
  component: DiscoverPage,
});

function DiscoverPage() {
  const { agents, isLoading } = useAgents();
  const [mode, setMode] = useState<ModeFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("pnl");

  // Filter by mode
  const filtered = useMemo(() => {
    if (mode === "all") return agents;
    if (mode === "live") return agents.filter(a => a.status === "active");
    if (mode === "backtest") return agents.filter(a => a.status === "paused" || a.status === "inactive");
    return agents;
  }, [agents, mode]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "pnl": return Number(b.totalPnl || 0) - Number(a.totalPnl || 0);
        case "aum": return Number(b.aum || 0) - Number(a.aum || 0);
        case "winRate": return Number(b.winRate || 0) - Number(a.winRate || 0);
        case "copiers": return Number(b.copiers || 0) - Number(a.copiers || 0);
        default: return 0;
      }
    });
  }, [filtered, sortBy]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Discover Agents</h1>
          <p className="text-sm text-muted-foreground">
            {agents.length} agents · {filtered.length} showing · sorted by {sortBy.toUpperCase()}
          </p>
        </div>
      </div>

      {/* Mode Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setMode("all")}
          className={`inline-flex items-center gap-1.5 h-8 px-3 rounded border ticker text-[11px] tracking-wider transition-colors ${
            mode === "all" ? "border-neon bg-neon/10 text-neon" : "border-border bg-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity className="h-3 w-3" /> ALL
        </button>
        <button
          onClick={() => setMode("live")}
          className={`inline-flex items-center gap-1.5 h-8 px-3 rounded border ticker text-[11px] tracking-wider transition-colors ${
            mode === "live" ? "border-neon bg-neon/10 text-neon" : "border-border bg-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-neon animate-pulse" /> LIVE
        </button>
        <button
          onClick={() => setMode("backtest")}
          className={`inline-flex items-center gap-1.5 h-8 px-3 rounded border ticker text-[11px] tracking-wider transition-colors ${
            mode === "backtest" ? "border-neon bg-neon/10 text-neon" : "border-border bg-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FlaskConical className="h-3 w-3" /> BACKTEST
        </button>
      </div>

      {/* Sort Controls */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(["pnl", "aum", "winRate", "copiers"] as SortKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={`h-7 px-3 rounded border ticker text-[10px] tracking-wider transition-colors ${
              sortBy === key ? "border-violet bg-violet/10 text-violet" : "border-border bg-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {key === "pnl" ? "PnL" : key === "aum" ? "AUM" : key === "winRate" ? "Win Rate" : "Copiers"}
            {sortBy === key && " ▼"}
          </button>
        ))}
      </div>

      {/* Agents Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-lg border border-border bg-card h-16" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Search className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No agents found for this filter. Try another mode.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-2/60 ticker text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Agent</th>
                <th className="px-4 py-3 text-left">Skills</th>
                <th className="px-4 py-3 text-right">PnL</th>
                <th className="px-4 py-3 text-right">Trades</th>
                <th className="px-4 py-3 text-right">Win</th>
                <th className="px-4 py-3 text-right">Copiers</th>
                <th className="px-4 py-3 text-right">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((a, i) => {
                const pnl = Number(a.totalPnl || 0);
                const winRate = Number(a.winRate || 0);
                const copiers = Number(a.copiers || 0);
                const trades = Number(a.tradeCount || 0);
                const skills = (a.skills || "perp").split(",").map(s => s.trim());

                return (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-surface-2/30 transition-colors">
                    {/* Agent */}
                    <td className="px-4 py-3">
                      <Link to="/agent/$id" params={{ id: a.id }} className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-2 font-display text-lg font-semibold">
                          {a.name?.[0] || "?"}
                        </span>
                        <div>
                          <div className="font-display font-semibold text-sm">{a.name}</div>
                          <div className="ticker text-[11px] text-muted-foreground">@{a.handle}</div>
                        </div>
                      </Link>
                    </td>

                    {/* Skills */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {skills.slice(0, 2).map((s) => (
                          <Badge key={s} variant="outline" className="ticker text-[10px] border-border bg-surface-2/60">
                            {s}
                          </Badge>
                        ))}
                        {skills.length > 2 && (
                          <Badge variant="outline" className="ticker text-[10px] border-border bg-surface-2/60">
                            +{skills.length - 2}
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* PnL */}
                    <td className={`px-4 py-3 text-right ticker font-semibold ${pnl >= 0 ? "text-neon" : "text-loss"}`}>
                      {pnl >= 0 ? "+" : ""}${pnl.toLocaleString()}
                    </td>

                    {/* Trades */}
                    <td className="px-4 py-3 text-right ticker text-muted-foreground">
                      {trades}
                    </td>

                    {/* Win Rate */}
                    <td className="px-4 py-3 text-right">
                      <span className={`ticker text-xs px-2 py-0.5 rounded ${winRate >= 50 ? "bg-neon/10 text-neon" : "bg-loss/10 text-loss"}`}>
                        {winRate}%
                      </span>
                    </td>

                    {/* Copiers */}
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1 ticker text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {copiers}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center gap-1 ticker text-[10px] px-2 py-0.5 rounded border ${
                        a.status === "active" 
                          ? "border-neon/30 bg-neon/5 text-neon" 
                          : "border-amber-400/30 bg-amber-400/5 text-amber-400"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${a.status === "active" ? "bg-neon animate-pulse" : "bg-amber-400"}`} />
                        {a.status?.toUpperCase() || "INACTIVE"}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/agent/$id"
                        params={{ id: a.id }}
                        className="text-neon hover:underline ticker text-xs"
                      >
                        open →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bottom info */}
      {!isLoading && sorted.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground text-right">
          Auto-refreshing every 60s · Data from <span className="text-neon">Trivo API</span> · <span className="text-violet">Arc Testnet</span>
        </p>
      )}
    </div>
  );
}

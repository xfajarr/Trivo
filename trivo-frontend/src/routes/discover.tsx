import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Sparkles } from "lucide-react";
import { useAgents } from "@/hooks/useAgents";
import { CreateAgentModal } from "@/components/CreateAgentModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtUSD, fmtPct } from "@/lib/utils";

type ModeFilter = "all" | "testnet" | "mainnet";
type SortKey = "pnl" | "aum" | "winRate" | "copiers";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discover Agents · Trivo" },
      { name: "description", content: "Browse all AI trading agents on Trivo. Rank by PnL, win rate, and copiers." },
    ],
  }),
  component: DiscoverPage,
});

function DiscoverPage() {
  const { agents, isLoading } = useAgents();
  const [mode, setMode] = useState<ModeFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("pnl");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filtered = useMemo(() => {
    if (mode === "all") return agents;
    if (mode === "testnet") return agents.filter(a => a.status === "active" || a.status === "paused");
    if (mode === "mainnet") return [];
    return agents;
  }, [agents, mode]);

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
      {/* Header + Create Button */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Discover Agents</h1>
          <p className="text-sm text-muted-foreground">
            {agents.length} agents · {filtered.length} showing · sorted by {sortBy.toUpperCase()}
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="bg-neon text-primary-foreground hover:bg-neon/90 glow-neon">
          Create Agent
        </Button>
      </div>

      {/* Mode Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setMode("all")} className={`inline-flex items-center gap-1.5 h-8 px-3 rounded border ticker text-[11px] tracking-wider transition-colors ${mode === "all" ? "border-neon bg-neon/10 text-neon" : "border-border bg-transparent text-muted-foreground hover:text-foreground"}`}>
          ALL
        </button>
        <button onClick={() => setMode("testnet")} className={`inline-flex items-center gap-1.5 h-8 px-3 rounded border ticker text-[11px] tracking-wider transition-colors ${mode === "testnet" ? "border-neon bg-neon/10 text-neon" : "border-border bg-transparent text-muted-foreground hover:text-foreground"}`}>
          TESTNET
        </button>
        <button onClick={() => setMode("mainnet")} className={`inline-flex items-center gap-1.5 h-8 px-3 rounded border ticker text-[11px] tracking-wider transition-colors ${mode === "mainnet" ? "border-neon bg-neon/10 text-neon" : "border-border bg-transparent text-muted-foreground hover:text-foreground opacity-50 cursor-not-allowed"}`} title="Coming soon">
          MAINNET <span className="text-[9px] text-amber-400 ml-0.5">SOON</span>
        </button>
      </div>

      {/* Sort Controls */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(["pnl", "aum", "winRate", "copiers"] as SortKey[]).map((key) => (
          <button key={key} onClick={() => setSortBy(key)} className={`h-7 px-3 rounded border ticker text-[10px] tracking-wider transition-colors ${sortBy === key ? "border-violet bg-violet/10 text-violet" : "border-border bg-transparent text-muted-foreground hover:text-foreground"}`}>
            {key === "pnl" ? "PnL" : key === "aum" ? "AUM" : key === "winRate" ? "Win Rate" : "Copiers"}{sortBy === key && " ▼"}
          </button>
        ))}
      </div>

      {/* Table or Empty States */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="animate-pulse rounded-lg border border-border bg-card h-16" />)}</div>
      ) : mode === "mainnet" ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          
          <h3 className="font-display text-lg font-semibold mb-2">Mainnet — Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">Live mainnet agents with real USDC trading will be available soon.</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          
          <p className="text-sm text-muted-foreground mb-4">No agents found. Be the first to launch one!</p>
          <Button onClick={() => setShowCreateModal(true)} className="bg-neon text-primary-foreground hover:bg-neon/90">
            Create Agent
          </Button>
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
                <th className="px-4 py-3 text-right">Network</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((a) => {
                const pnl = Number(a.totalPnl || 0);
                const winRate = Number(a.winRate || 0);
                const copiers = Number(a.copiers || 0);
                const trades = Number(a.tradeCount || 0);
                const skills = (a.skills || "perp").split(",").map(s => s.trim());
                const isActive = a.status === "active";
                return (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-surface-2/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link to="/agent/$id" params={{ id: a.id }} className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-2 font-display text-lg font-semibold">{a.name?.[0] || "?"}</span>
                        <div><div className="font-display font-semibold text-sm">{a.name}</div><div className="ticker text-[11px] text-muted-foreground">@{a.handle}</div></div>
                      </Link>
                    </td>
                    <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{skills.slice(0,2).map(s => <Badge key={s} variant="outline" className="ticker text-[10px] border-border bg-surface-2/60">{s}</Badge>)}{skills.length > 2 && <Badge variant="outline" className="ticker text-[10px] border-border bg-surface-2/60">+{skills.length-2}</Badge>}</div></td>
                    <td className={`px-4 py-3 text-right ticker font-semibold ${pnl >= 0 ? "text-neon" : "text-loss"}`}>{pnl >= 0 ? "+" : ""}${pnl.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right ticker text-muted-foreground">{trades}</td>
                    <td className="px-4 py-3 text-right"><span className={`ticker text-xs px-2 py-0.5 rounded ${winRate >= 50 ? "bg-neon/10 text-neon" : "bg-loss/10 text-loss"}`}>{winRate}%</span></td>
                    <td className="px-4 py-3 text-right"><div className="inline-flex items-center gap-1 ticker text-xs text-muted-foreground">{copiers}</div></td>
                    <td className="px-4 py-3 text-right"><span className={`inline-flex items-center gap-1 ticker text-[10px] px-2 py-0.5 rounded border ${isActive ? "border-neon/30 bg-neon/5 text-neon" : "border-amber-400/30 bg-amber-400/5 text-amber-400"}`}><span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-neon animate-pulse" : "bg-amber-400"}`} />ARC TESTNET</span></td>
                    <td className="px-4 py-3 text-right"><Link to="/agent/$id" params={{ id: a.id }} className="text-neon hover:underline ticker text-xs">open →</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {!isLoading && sorted.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground text-right">
          PnL auto-refreshes every 60s · <span className="text-violet">Arc Testnet</span> · Mock execution with real prices
        </p>
      )}

      {/* Create Agent Modal */}
      <CreateAgentModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}

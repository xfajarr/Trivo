import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useAgents } from "@/hooks/useAgents";
import { usePortfolioPnl } from "@/hooks/usePortfolioPnl";
import { CreateAgentModal } from "@/components/CreateAgentModal";
import { useTimeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ModeFilter = "all" | "testnet" | "mainnet";
type SortKey = "pnl" | "aum" | "winRate" | "copiers";

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
  const { data: pnlData } = usePortfolioPnl(agents.map((a) => a.id));
  const [mode, setMode] = useState<ModeFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("pnl");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filtered = useMemo(() => {
    if (mode === "all") return agents;
    if (mode === "testnet")
      return agents.filter((a) => a.status === "active" || a.status === "paused");
    if (mode === "mainnet") return [];
    return agents;
  }, [agents, mode]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === "pnl") {
        const pa = Number(a.totalPnl || 0) + (pnlData?.[a.id]?.unrealizedPnl || 0);
        const pb = Number(b.totalPnl || 0) + (pnlData?.[b.id]?.unrealizedPnl || 0);
        return pb - pa;
      }
      if (sortBy === "aum") return Number(b.aum || 0) - Number(a.aum || 0);
      if (sortBy === "winRate") return Number(b.winRate || 0) - Number(a.winRate || 0);
      if (sortBy === "copiers") return Number(b.copiers || 0) - Number(a.copiers || 0);
      return 0;
    });
  }, [filtered, sortBy, pnlData]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Discover Agents</h1>
          <p className="text-sm text-muted-foreground">
            {agents.length} agents · {filtered.length} showing
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-neon text-primary-foreground hover:bg-neon/90"
        >
          Create Agent
        </Button>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {["all", "testnet", "mainnet"].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m as ModeFilter)}
            className={`h-8 px-3 rounded border ticker text-[11px] tracking-wider transition-colors ${mode === m ? "border-neon bg-neon/10 text-neon" : "border-border bg-transparent text-muted-foreground hover:text-foreground"} ${m === "mainnet" ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {m.toUpperCase()}
            {m === "mainnet" && <span className="text-[9px] text-amber-400 ml-0.5"> SOON</span>}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["pnl", "aum", "winRate", "copiers"] as SortKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={`h-7 px-3 rounded border ticker text-[10px] tracking-wider ${sortBy === key ? "border-violet bg-violet/10 text-violet" : "border-border bg-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {key === "pnl"
              ? "PnL"
              : key === "aum"
                ? "AUM"
                : key === "winRate"
                  ? "Win Rate"
                  : "Copiers"}
            {sortBy === key && " ▼"}
          </button>
        ))}
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-lg border border-border bg-card h-16" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">No agents found.</p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-neon text-primary-foreground hover:bg-neon/90"
          >
            Create Agent
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-2/60 ticker text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Agent</th>
                <th className="px-4 py-3 text-right">PnL (Realized)</th>
                <th className="px-4 py-3 text-right">Unrealized</th>
                <th className="px-4 py-3 text-right">Win</th>
                <th className="px-4 py-3 text-right">Copiers</th>
                <th className="px-4 py-3 text-right">Network</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((a) => {
                const realized = Number(a.totalPnl || 0);
                const unrealized = pnlData?.[a.id]?.unrealizedPnl || 0;
                const openPositions = pnlData?.[a.id]?.totalPositions || 0;
                const winRate = Number(a.winRate || 0);
                const skills = (a.skills || "perp").split(",").slice(0, 2);
                const isActive = a.status === "active";
                return (
                  <tr
                    key={a.id}
                    className="border-b border-border last:border-0 hover:bg-surface-2/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to="/agent/$id"
                        params={{ id: a.id }}
                        className="flex items-center gap-3"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-2 font-display text-lg font-semibold">
                          {a.name?.[0] || "?"}
                        </span>
                        <div>
                          <div className="font-display font-semibold text-sm">{a.name}</div>
                          <div className="ticker text-[11px] text-muted-foreground">
                            @{a.handle}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td
                      className={`px-4 py-3 text-right ticker font-semibold ${realized >= 0 ? "text-neon" : "text-loss"}`}
                    >
                      {realized >= 0 ? "+" : ""}${Math.abs(realized).toLocaleString()}
                    </td>
                    <td
                      className={`px-4 py-3 text-right ticker ${unrealized >= 0 ? "text-neon" : "text-loss"}`}
                    >
                      {unrealized >= 0 ? "+" : ""}${Math.abs(unrealized).toLocaleString()}
                      {openPositions > 0 && (
                        <span className="text-[9px] text-muted-foreground"> · {openPositions}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`ticker text-xs px-2 py-0.5 rounded ${winRate >= 50 ? "bg-neon/10 text-neon" : "bg-loss/10 text-loss"}`}
                      >
                        {winRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right ticker text-xs text-muted-foreground">
                      {Number(a.copiers || 0)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 ticker text-[10px] px-2 py-0.5 rounded border ${isActive ? "border-neon/30 bg-neon/5 text-neon" : "border-amber-400/30 bg-amber-400/5 text-amber-400"}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-neon animate-pulse" : "bg-amber-400"}`}
                        />
                        ARC TESTNET
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/agent/$id"
                        params={{ id: a.id }}
                        className="text-neon hover:underline ticker text-xs"
                      >
                        open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!isLoading && sorted.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground text-right">
          PnL refreshes every 10s · Arc Testnet
        </p>
      )}
      <CreateAgentModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}

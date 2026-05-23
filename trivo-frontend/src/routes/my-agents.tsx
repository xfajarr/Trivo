import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useAgents, useUpdateAgentStatus } from "@/hooks/useAgents";
import { usePortfolioPnl } from "@/hooks/usePortfolioPnl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/my-agents")({
  head: () => ({
    meta: [
      { title: "My Agents · Trivo" },
      { name: "description", content: "Your deployed AI trading agents and their live earnings." },
    ],
  }),
  component: MyAgents,
});

function MyAgents() {
  const { agents, isLoading } = useAgents();
  const { data: pnlData } = usePortfolioPnl(agents.map(a => a.id));
  const updateStatus = useUpdateAgentStatus();

  const myAgents = agents;
  const totalRealized = myAgents.reduce((s, a) => s + Number(a.totalPnl || 0), 0);
  const totalUnrealized = myAgents.reduce((s, a) => s + (pnlData?.[a.id]?.unrealizedPnl || 0), 0);
  const totalTrades = myAgents.reduce((s, a) => s + Number(a.tradeCount || 0), 0);
  const activeCount = myAgents.filter(a => a.status === "active").length;

  function toggleStatus(agent: { id: string; name: string; status: string }) {
    const newStatus = agent.status === "active" ? "paused" : "active";
    updateStatus.mutate({ id: agent.id, status: newStatus }, {
      onSuccess: () => toast.success(`${agent.name} ${newStatus}`),
      onError: () => toast.error(`Failed to ${newStatus} ${agent.name}`),
    });
  }

  if (isLoading) {
    return <div className="mx-auto max-w-6xl px-4 py-8"><div className="animate-pulse space-y-4"><div className="h-8 w-48 bg-surface-2 rounded" /><div className="grid gap-4 md:grid-cols-2">{[1,2].map(i => <div key={i} className="h-48 bg-surface-2 rounded-lg" />)}</div></div></div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">My Agents</h1>
          <p className="text-sm text-muted-foreground">{myAgents.length} agents · {activeCount} active · {totalTrades} total trades</p>
        </div>
        <Link to="/launch"><Button className="bg-neon text-primary-foreground hover:bg-neon/90"><Plus className="mr-1 h-4 w-4" /> New agent</Button></Link>
      </div>

      <div className="mb-6 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
        <Tile label="Agents" value={String(myAgents.length)} />
        <Tile label="Realized" value={`${totalRealized >= 0 ? "+" : ""}$${Math.abs(totalRealized).toLocaleString()}`} tone={totalRealized >= 0 ? "neon" : "loss"} />
        <Tile label="Unrealized" value={`${totalUnrealized >= 0 ? "+" : ""}$${Math.abs(totalUnrealized).toLocaleString()}`} tone={totalUnrealized >= 0 ? "neon" : "loss"} />
        <Tile label="Active" value={`${activeCount} / ${myAgents.length}`} />
      </div>

      {myAgents.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <h3 className="font-display text-lg font-semibold mb-2">No agents yet</h3>
          <p className="text-sm text-muted-foreground mb-6">Launch your first AI trading agent.</p>
          <Link to="/launch"><Button className="bg-neon text-primary-foreground hover:bg-neon/90"><Plus className="mr-1 h-4 w-4" /> Launch your first agent</Button></Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {myAgents.map(a => {
          const realized = Number(a.totalPnl || 0);
          const unrealized = pnlData?.[a.id]?.unrealizedPnl || 0;
          const openPositions = pnlData?.[a.id]?.totalPositions || 0;
          const trades = Number(a.tradeCount || 0);
          const winRate = Number(a.winRate || 0);
          const skills = (a.skills || "perp").split(",").slice(0,3);
          const isActive = a.status === "active";

          return (
            <article key={a.id} className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-neon/40">
              <div className="flex items-start gap-3">
                <Link to="/agent/$id" params={{ id: a.id }} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2 font-display text-xl font-bold">{a.name?.[0] || "?"}</Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link to="/agent/$id" params={{ id: a.id }} className="font-display text-lg font-semibold hover:text-neon truncate">{a.name}</Link>
                    <Badge variant="outline" className={`ticker text-[10px] shrink-0 ${isActive ? "border-neon/40 text-neon" : "border-amber-400/40 text-amber-400"}`}><span className={`h-1.5 w-1.5 rounded-full mr-1 inline-block ${isActive ? "bg-neon animate-pulse" : "bg-amber-400"}`} />{a.status?.toUpperCase() || "INACTIVE"}</Badge>
                  </div>
                  <div className="ticker text-[11px] text-muted-foreground">@{a.handle}</div>
                </div>
              </div>
              <p className="mt-3 text-sm text-foreground/80 line-clamp-2">{a.strategy || "AI trading agent"}</p>
              <div className="mt-3 flex flex-wrap gap-1">{skills.map(s => <Badge key={s} variant="outline" className="ticker text-[10px] border-border bg-surface-2/60">{s}</Badge>)}<Badge variant="outline" className="ticker text-[10px] border-border bg-surface-2/60">{a.modelProvider || "asi1"}</Badge></div>
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-md border border-border bg-surface-2/50 p-3 text-xs">
                <Cell label="Realized" value={`${realized >= 0 ? "+" : ""}$${Math.abs(realized).toLocaleString()}`} tone={realized >= 0 ? "neon" : "loss"} />
                <Cell label="Unrealized" value={`${unrealized >= 0 ? "+" : ""}$${Math.abs(unrealized).toLocaleString()}${openPositions > 0 ? ` · ${openPositions}` : ""}`} tone={unrealized >= 0 ? "neon" : "loss"} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 rounded-md border border-border bg-surface-2/50 p-2 text-xs">
                <Cell label="Trades" value={String(trades)} />
                <Cell label="Win Rate" value={`${winRate}%`} tone={winRate >= 50 ? "neon" : "loss"} />
                <Cell label="Copiers" value={String(Number(a.copiers || 0))} />
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => toggleStatus(a)} disabled={updateStatus.isPending}>{isActive ? "Pause" : "Resume"}</Button>
                <Link to="/agent/$id" params={{ id: a.id }} className="flex-1"><Button size="sm" className="w-full bg-neon text-primary-foreground hover:bg-neon/90">Open</Button></Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: "neon" | "loss" }) {
  return <div className="bg-card p-4"><div className="ticker text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div><div className={`ticker mt-1 text-xl font-semibold ${tone === "neon" ? "text-neon" : tone === "loss" ? "text-loss" : ""}`}>{value}</div></div>;
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: "neon" | "loss" }) {
  return <div className="flex flex-col"><span className="ticker text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span><span className={`ticker mt-0.5 ${tone === "neon" ? "text-neon" : tone === "loss" ? "text-loss" : ""}`}>{value}</span></div>;
}

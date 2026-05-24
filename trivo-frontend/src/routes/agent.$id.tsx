import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Copy, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AgentChat } from "@/components/AgentChat";
import { AgentChart } from "@/components/AgentChart";
import { useAgent } from "@/hooks/useAgents";
import { usePositions } from "@/hooks/usePositions";
import { useAgentPnl } from "@/hooks/usePortfolioPnl";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fmtUSD, useTimeAgo } from "@/lib/utils";

export const Route = createFileRoute("/agent/$id")({
  component: AgentDetail,
  notFoundComponent: () => (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="font-display text-2xl font-bold mb-2">Agent Not Found</h1>
      <Link to="/discover" className="text-neon hover:underline text-sm">Back to Discover</Link>
    </div>
  ),
});

function AgentDetail() {
  const { id } = Route.useParams();
  const { data: agentData, isLoading } = useAgent(id);
  const { positions } = usePositions(id);
  const { data: pnlData } = useAgentPnl(id);
  const agent = agentData?.agent;
  const [following, setFollowing] = useState(false);
  const [copyAll, setCopyAll] = useState(false);

  // Trade history
  const { data: history } = useQuery({
    queryKey: ["trade-history", id],
    queryFn: () => api.get(`/api/positions/history/${id}`).then(r => r.data),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="mx-auto max-w-6xl px-4 py-20"><div className="animate-pulse space-y-6"><div className="h-8 w-48 bg-surface-2 rounded" /><div className="h-20 w-full bg-surface-2 rounded-lg" /></div></div>;
  }
  if (!agent) {
    return <div className="flex flex-col items-center justify-center py-20 text-center"><h1 className="font-display text-2xl font-bold mb-2">Agent Not Found</h1><Link to="/discover" className="text-neon hover:underline text-sm">Back to Discover</Link></div>;
  }

  const realized = Number(agent.totalPnl || 0);
  const unrealized = pnlData?.unrealizedPnl || 0;
  const totalPnl = realized + unrealized;
  const winRate = Number(agent.winRate || 0);
  const trades = Number(agent.tradeCount || 0);
  const copiers = Number(agent.copiers || 0);
  const skills = (agent.skills || "perp").split(",").map((s: string) => s.trim());
  const isActive = agent.status === "active";

  return (
    <div>
      <div className="relative border-b border-border bg-grid bg-hero">
        <div className="absolute inset-0 opacity-40" style={{ background: "radial-gradient(ellipse 60% 80% at 20% 0%, var(--neon)33, transparent 70%)" }} />
        <div className="relative mx-auto max-w-6xl px-4 py-8">
          <Link to="/feed" className="ticker mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> back to feed</Link>

          <div className="flex flex-wrap items-start gap-4 sm:gap-6">
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-xl border border-neon/30 bg-surface-2 font-display text-3xl sm:text-4xl font-bold text-neon">{agent.name?.[0] || "?"}</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl sm:text-3xl font-bold">{agent.name}</h1>
                <Badge variant="outline" className={`ticker text-[10px] ${isActive ? "border-neon/40 text-neon" : "border-amber-400/40 text-amber-400"}`}><span className={`h-1.5 w-1.5 rounded-full mr-1.5 inline-block ${isActive ? "bg-neon animate-pulse" : "bg-amber-400"}`} />{agent.status?.toUpperCase() || "INACTIVE"}</Badge>
              </div>
              <div className="ticker mt-1 text-sm text-muted-foreground">@{agent.handle || "agent"} · Model: {agent.modelProvider || "ASI1"} · Arc Testnet</div>
              <p className="mt-3 max-w-2xl text-sm text-foreground/90">{agent.strategy || "AI trading agent running on Trivo"}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">{skills.map((s: string) => <Badge key={s} variant="outline" className="ticker text-[10px] border-border bg-surface-2/60">{s}</Badge>)}</div>
            </div>
            <div className="flex w-full flex-row gap-2 sm:w-auto sm:flex-col">
              <Button onClick={() => { setCopyAll(true); toast.success(`Copy-trading ${agent.name}`); }} disabled={copyAll} className="flex-1 bg-neon text-primary-foreground hover:bg-neon/90 disabled:bg-muted"><Copy className="mr-2 h-4 w-4" />{copyAll ? "Copy-trading" : "Copy"}</Button>
              <Button variant="outline" onClick={() => setFollowing(f => !f)} className={following ? "border-violet text-violet" : "border-border"}><UserPlus className="mr-2 h-4 w-4" />{following ? "Following" : "Follow"}</Button>
            </div>
          </div>

          {/* PnL Stats */}
          <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3 md:grid-cols-6">
            <Stat label="Realized PnL" value={`${realized >= 0 ? "+" : ""}$${Math.abs(realized).toLocaleString()}`} positive={realized >= 0} />
            <Stat label="Unrealized PnL" value={`${unrealized >= 0 ? "+" : ""}$${Math.abs(unrealized).toLocaleString()}`} positive={unrealized >= 0} />
            <Stat label="Total PnL" value={`${totalPnl >= 0 ? "+" : ""}$${Math.abs(totalPnl).toLocaleString()}`} positive={totalPnl >= 0} />
            <Stat label="Win Rate" value={`${winRate}%`} positive={winRate >= 50} />
            <Stat label="Trades" value={trades.toLocaleString()} />
            <Stat label="Copiers" value={copiers.toLocaleString()} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">

      {/* Chart */}
      <div className="mb-6">
        <AgentChart
          pair={history?.trades?.[0]?.market || "BTC/USD"}
          trades={(history?.trades || []).map((t: any) => ({
            time: t.closedAt ? Math.floor(new Date(t.closedAt).getTime() / 1000) : t.openedAt ? Math.floor(new Date(t.openedAt).getTime() / 1000) : Math.floor(Date.now() / 1000),
            price: Number(t.entryPrice) || 0,
            type: t.status === "open" ? "entry" : t.pnl && Number(t.pnl) !== 0 ? "close" : "entry",
            side: t.side || "long",
            pnl: Number(t.pnl || 0),
            reasoning: t.reasoning,
            size: Number(t.size || 0),
          })).reverse()}
          height={280}
        />
      </div>
        <Tabs defaultValue="positions" className="w-full">
          <TabsList className="bg-surface-2">
            <TabsTrigger value="positions">Positions ({positions.length})</TabsTrigger>
            <TabsTrigger value="history">History ({history?.totalTrades || 0})</TabsTrigger>
            <TabsTrigger value="chat">Train</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="positions" className="mt-4">
            {positions.length === 0 ? (
              <div className="rounded-lg border border-border bg-card p-12 text-center"><p className="text-sm text-muted-foreground">No open positions.</p></div>
            ) : (
              <div className="space-y-3">
                {positions.map(pos => {
                  const posPnl = Number(pos.pnl || 0);
                  return (
                    <div key={pos.id} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`ticker text-xs font-semibold px-2 py-0.5 rounded bg-neon/10 text-neon`}>{pos.side?.toUpperCase() || "LONG"}</span>
                        <div>
                          <div className="font-display text-sm">{pos.venue?.toUpperCase()} · {pos.market}</div>
                          <div className="ticker text-[11px] text-muted-foreground">Size: ${Number(pos.size || 0).toLocaleString()} · Entry: ${Number(pos.entryPrice || 0).toLocaleString()}{pos.leverage && Number(pos.leverage) > 1 ? ` · ${pos.leverage}x` : ""}</div>
                        </div>
                      </div>
                      <div className="text-right"><div className={`font-display font-semibold ${posPnl >= 0 ? "text-neon" : "text-loss"}`}>{posPnl >= 0 ? "+" : ""}${Math.abs(posPnl).toLocaleString()}</div><div className="ticker text-[10px] text-muted-foreground">OPEN</div></div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {!history?.trades?.length ? (
              <div className="rounded-lg border border-border bg-card p-12 text-center"><p className="text-sm text-muted-foreground">No trade history yet.</p></div>
            ) : (
              <div>
                <div className="mb-4 flex gap-4 text-sm">
                  <span className="ticker text-muted-foreground">Win Rate: <span className={history.winRate >= 50 ? "text-neon" : "text-loss"}>{history.winRate}%</span></span>
                  <span className="ticker text-muted-foreground">Total PnL: <span className={history.totalPnl >= 0 ? "text-neon" : "text-loss"}>${history.totalPnl.toLocaleString()}</span></span>
                </div>
                <div className="space-y-2">
                  {history.trades.map((t: any) => (
                    <div key={t.id} className="rounded-lg border border-border bg-card p-3 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <span className={`ticker text-[10px] px-2 py-0.5 rounded ${Number(t.pnl || 0) >= 0 ? "bg-neon/10 text-neon" : "bg-loss/10 text-loss"}`}>{t.side?.toUpperCase()}</span>
                        <span className="font-display text-sm">{t.market}</span>
                        <span className="text-xs text-muted-foreground">${Number(t.entryPrice).toLocaleString()} → ${Number(t.markPrice || 0).toLocaleString()}</span>
                      </div>
                      <div className={`font-display font-semibold ${Number(t.pnl || 0) >= 0 ? "text-neon" : "text-loss"}`}>{Number(t.pnl || 0) >= 0 ? "+" : ""}${Math.abs(Number(t.pnl || 0)).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>


          <TabsContent value="chat" className="mt-4">
            <AgentChat agentId={id} agentName={agent.name} />
          </TabsContent>
          <TabsContent value="settings" className="mt-4">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-display font-semibold mb-4">Agent Configuration</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Model:</span> {agent.modelProvider || "ASI1"}</div>
                <div><span className="text-muted-foreground">Status:</span> {agent.status || "inactive"}</div>
                <div><span className="text-muted-foreground">Max Leverage:</span> {agent.maxLeverage || "5"}x</div>
                <div><span className="text-muted-foreground">Stop Loss:</span> {agent.stopLossPct || "10"}%</div>
                <div><span className="text-muted-foreground">Spend Limit:</span> ${agent.spendLimit || "100"}</div>
                <div><span className="text-muted-foreground">Skills:</span> {agent.skills || "perp"}</div>
                {agent.erc8004TokenId && (
                  <div className="col-span-2"><span className="text-muted-foreground">ERC-8004:</span> Agent #{agent.erc8004TokenId} {agent.erc8004TxHash && <a href={`https://testnet.arcscan.app/tx/${agent.erc8004TxHash}`} target="_blank" rel="noopener" className="ml-2 text-violet hover:underline ticker text-xs">Arcscan</a>}</div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Stat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return <div className="bg-card p-4"><div className="ticker text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div><div className={`ticker mt-1 text-lg font-semibold ${positive === undefined ? "" : positive ? "text-neon" : "text-loss"}`}>{value}</div></div>;
}

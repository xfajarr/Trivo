import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Copy, UserPlus, Activity } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FeedItem } from "@/components/FeedItem";
import { PositionsTimeline } from "@/components/PositionsTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fmtPct, fmtUSD, getAgent, positionsOf, VENUE_LABEL } from "@/lib/mock-data";

export const Route = createFileRoute("/agent/$id")({
  head: ({ params }) => {
    const a = getAgent(params.id);
    return {
      meta: [
        { title: `${a?.name ?? "Agent"} · Agentpit` },
        { name: "description", content: a?.strategy ?? "AI trading agent" },
      ],
    };
  },
  component: AgentDetail,
  notFoundComponent: () => <div className="p-8 text-center">Agent not found</div>,
});

function AgentDetail() {
  const { id } = Route.useParams();
  const agent = getAgent(id);
  const positions = positionsOf(id);
  const [following, setFollowing] = useState(false);
  const [copyAll, setCopyAll] = useState(false);

  if (!agent) {
    return <div className="p-8 text-center">Agent not found</div>;
  }

  return (
    <div>
      {/* Hero banner */}
      <div className="relative border-b border-border bg-grid bg-hero">
        <div
          className="absolute inset-0 opacity-40"
          style={{ background: `radial-gradient(ellipse 60% 80% at 20% 0%, ${agent.color}33, transparent 70%)` }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-8">
          <Link to="/feed" className="ticker mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> back to feed
          </Link>

          <div className="flex flex-wrap items-start gap-4 sm:gap-6">
            <div
              className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-xl font-display text-3xl sm:text-4xl"
              style={{
                color: agent.color,
                boxShadow: `inset 0 0 0 1px ${agent.color}66, 0 0 32px ${agent.color}33`,
              }}
            >
              {agent.avatar}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl sm:text-3xl font-bold">{agent.name}</h1>
                <Badge variant="outline" className={`ticker text-[10px] ${agent.status === "LIVE" ? "border-neon/40 text-neon" : "border-muted text-muted-foreground"}`}>
                  ● {agent.status}
                </Badge>
              </div>
              <div className="ticker mt-1 text-sm text-muted-foreground">
                @{agent.handle} · owned by {agent.owner}
              </div>
              <p className="mt-3 max-w-2xl text-sm text-foreground/90">{agent.strategy}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {agent.venues.map((v) => (
                  <Badge key={v} variant="outline" className="ticker text-[10px] border-border bg-surface-2/60">
                    {VENUE_LABEL[v]}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex w-full flex-row gap-2 sm:w-auto sm:flex-col">
              <Button
                onClick={() => { setCopyAll(true); toast.success(`Copy-trading ${agent.name}`, { description: "All future positions will mirror into your agent." }); }}
                disabled={copyAll}
                className="flex-1 bg-neon text-primary-foreground hover:bg-neon/90 glow-neon disabled:bg-muted disabled:text-muted-foreground"
              >
                <Copy className="mr-2 h-4 w-4" />
                {copyAll ? "Copy-trading" : "Copy this agent"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setFollowing((f) => !f)}
                className={following ? "border-violet text-violet" : "border-border"}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                {following ? "Following" : "Follow"}
              </Button>
            </div>
          </div>

          {/* Stats grid */}
          <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3 md:grid-cols-6">
            <Stat label="AUM" value={fmtUSD(agent.aum, { compact: true })} />
            <Stat label="PnL 24h" value={fmtPct(agent.pnl24h)} positive={agent.pnl24h >= 0} />
            <Stat label="PnL 7d" value={fmtPct(agent.pnl7d)} positive={agent.pnl7d >= 0} />
            <Stat label="Win rate" value={`${agent.winRate}%`} />
            <Stat label="Copiers" value={agent.copiers.toLocaleString()} />
            <Stat label="Trades" value={agent.trades.toLocaleString()} />
          </div>
        </div>
      </div>

      {/* Activity + positions */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-neon" />
          <h2 className="font-display text-xl font-semibold">
            Activity <span className="ticker text-sm text-muted-foreground">· {positions.length} open</span>
          </h2>
        </div>

        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="bg-surface-2">
            <TabsTrigger value="timeline">Timeline & PnL</TabsTrigger>
            <TabsTrigger value="cards">Position cards</TabsTrigger>
          </TabsList>
          <TabsContent value="timeline" className="mt-4">
            <PositionsTimeline positions={positions} />
          </TabsContent>
          <TabsContent value="cards" className="mt-4">
            <div className="space-y-3">
              {positions.map((p) => (
                <FeedItem key={p.id} pos={p} />
              ))}
              {positions.length === 0 && (
                <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                  No open positions right now.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Stat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="bg-card p-4">
      <div className="ticker text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div
        className={`ticker mt-1 text-lg font-semibold ${
          positive === undefined ? "" : positive ? "text-neon" : "text-loss"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

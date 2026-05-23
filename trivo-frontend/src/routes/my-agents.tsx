import { createFileRoute, Link } from "@tanstack/react-router";
import { Pause, Play, Plus, Settings2 } from "lucide-react";
import { AGENTS, fmtPct, fmtUSD, VENUE_LABEL } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/my-agents")({
  head: () => ({
    meta: [
      { title: "My Agents · Agentpit" },
      { name: "description", content: "Your deployed AI trading agents and their live earnings." },
    ],
  }),
  component: MyAgents,
});

// Pretend the first 2 agents are owned by the user
const MINE = AGENTS.slice(0, 2);

function MyAgents() {
  const totalAum = MINE.reduce((s, a) => s + a.aum, 0);
  const totalPnl = MINE.reduce((s, a) => s + a.aum * (a.pnl24h / 100), 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">My Agents</h1>
          <p className="text-sm text-muted-foreground">
            {MINE.length} agents deployed · earning for you 24/7
          </p>
        </div>
        <Link to="/launch">
          <Button className="bg-neon text-primary-foreground hover:bg-neon/90 glow-neon">
            <Plus className="mr-1 h-4 w-4" /> New agent
          </Button>
        </Link>
      </div>

      {/* Portfolio summary */}
      <div className="mb-6 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
        <Tile label="Total AUM" value={fmtUSD(totalAum, { compact: true })} />
        <Tile
          label="PnL 24h"
          value={`${totalPnl >= 0 ? "+" : ""}${fmtUSD(totalPnl, { compact: true })}`}
          tone={totalPnl >= 0 ? "neon" : "loss"}
        />
        <Tile label="Active venues" value={String(new Set(MINE.flatMap((a) => a.venues)).size)} />
        <Tile label="Copiers" value={String(MINE.reduce((s, a) => s + a.copiers, 0))} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {MINE.map((a) => (
          <article
            key={a.id}
            className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-neon/40"
          >
            <div className="flex items-start gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded font-display text-xl"
                style={{ color: a.color, boxShadow: `inset 0 0 0 1px ${a.color}55` }}
              >
                {a.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    to="/agent/$id"
                    params={{ id: a.id }}
                    className="font-display text-lg font-semibold hover:text-neon"
                  >
                    {a.name}
                  </Link>
                  <Badge variant="outline" className="ticker text-[10px] border-neon/40 text-neon">
                    ● {a.status}
                  </Badge>
                </div>
                <div className="ticker text-[11px] text-muted-foreground">@{a.handle}</div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings2 className="h-4 w-4" />
              </Button>
            </div>

            <p className="mt-3 text-sm text-foreground/80 line-clamp-2">{a.strategy}</p>

            <div className="mt-3 flex flex-wrap gap-1">
              {a.venues.map((v) => (
                <Badge
                  key={v}
                  variant="outline"
                  className="ticker text-[10px] border-border bg-surface-2/60"
                >
                  {VENUE_LABEL[v]}
                </Badge>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2 rounded-md border border-border bg-surface-2/50 p-2 text-xs">
              <Cell label="AUM" value={fmtUSD(a.aum, { compact: true })} />
              <Cell label="24h" value={fmtPct(a.pnl24h)} tone={a.pnl24h >= 0 ? "neon" : "loss"} />
              <Cell label="7d" value={fmtPct(a.pnl7d)} tone={a.pnl7d >= 0 ? "neon" : "loss"} />
              <Cell label="Copiers" value={String(a.copiers)} />
            </div>

            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Pause className="mr-1 h-3.5 w-3.5" /> Pause
              </Button>
              <Link to="/agent/$id" params={{ id: a.id }} className="flex-1">
                <Button
                  size="sm"
                  className="w-full bg-neon text-primary-foreground hover:bg-neon/90"
                >
                  <Play className="mr-1 h-3.5 w-3.5" /> Open
                </Button>
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: "neon" | "loss" }) {
  return (
    <div className="bg-card p-4">
      <div className="ticker text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div
        className={`ticker mt-1 text-xl font-semibold ${
          tone === "neon" ? "text-neon" : tone === "loss" ? "text-loss" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: "neon" | "loss" }) {
  return (
    <div className="flex flex-col">
      <span className="ticker text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span
        className={`ticker mt-0.5 ${tone === "neon" ? "text-neon" : tone === "loss" ? "text-loss" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

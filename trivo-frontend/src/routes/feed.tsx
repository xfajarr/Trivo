import { createFileRoute, Link } from "@tanstack/react-router";
import { Filter, Flame, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { FeedItem } from "@/components/FeedItem";
import { Button } from "@/components/ui/button";
import { AGENTS, POSITIONS, Venue, VENUE_LABEL, fmtPct, fmtUSD } from "@/lib/mock-data";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Live Feed · Agentpit" },
      { name: "description", content: "Every agent position, streamed live. Copy any trade in one click." },
    ],
  }),
  component: FeedPage,
});

const VENUES: ("ALL" | Venue)[] = ["ALL", "PERP", "PREDICTION", "LP", "YIELD", "SPOT"];

function FeedPage() {
  const [filter, setFilter] = useState<"ALL" | Venue>("ALL");
  const positions = useMemo(
    () =>
      [...POSITIONS]
        .filter((p) => filter === "ALL" || p.venue === filter)
        .sort((a, b) => b.openedAt - a.openedAt),
    [filter],
  );

  const top = [...AGENTS].sort((a, b) => b.pnl7d - a.pnl7d).slice(0, 4);

  return (
    <div className="bg-grid bg-grid-fade">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">
                Live Feed
                <span className="ml-2 text-neon">_</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                Every position from every agent, the moment it opens.
              </p>
            </div>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="mb-4 -mx-1 flex flex-nowrap gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap">
            {VENUES.map((v) => (
              <Button
                key={v}
                variant="outline"
                size="sm"
                onClick={() => setFilter(v)}
                className={`h-7 shrink-0 ticker text-[11px] tracking-wider ${
                  filter === v
                    ? "border-neon bg-neon/10 text-neon"
                    : "border-border bg-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {v === "ALL" ? "ALL" : VENUE_LABEL[v as Venue].toUpperCase()}
              </Button>
            ))}
          </div>

          <div className="space-y-3">
            {positions.map((p) => (
              <FeedItem key={p.id} pos={p} />
            ))}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Flame className="h-4 w-4 text-neon" />
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider">
                Top performers · 7d
              </h3>
            </div>
            <ul className="space-y-2">
              {top.map((a, i) => (
                <li key={a.id}>
                  <Link
                    to="/agent/$id"
                    params={{ id: a.id }}
                    className="flex items-center gap-3 rounded-md border border-transparent p-2 hover:border-border hover:bg-surface-2/50"
                  >
                    <span className="ticker w-4 text-xs text-muted-foreground">{i + 1}</span>
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded font-display text-sm"
                      style={{ color: a.color, boxShadow: `inset 0 0 0 1px ${a.color}55` }}
                    >
                      {a.avatar}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-display text-sm">{a.name}</div>
                      <div className="ticker text-[10px] text-muted-foreground">
                        AUM {fmtUSD(a.aum, { compact: true })}
                      </div>
                    </div>
                    <span className={`ticker text-xs ${a.pnl7d >= 0 ? "text-neon" : "text-loss"}`}>
                      {fmtPct(a.pnl7d)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-neon/30 bg-card p-4 glow-neon">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-neon" />
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider">
                Launch your agent
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Programmable AI that trades perps, prediction markets, LPs and yield — 24/7, on your rules.
            </p>
            <Link to="/launch" className="mt-3 block">
              <Button className="w-full bg-neon text-primary-foreground hover:bg-neon/90">
                Configure strategy →
              </Button>
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

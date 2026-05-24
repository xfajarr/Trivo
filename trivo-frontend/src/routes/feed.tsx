import { createFileRoute, Link } from "@tanstack/react-router";
import { Filter } from "lucide-react";
import { FeedItem } from "@/components/FeedItem";
import { Button } from "@/components/ui/button";
import { useFeed } from "@/hooks/useFeed";
import { useAgents } from "@/hooks/useAgents";
import { VENUE_LABEL, VENUES } from "@/lib/constants";
import { fmtUSD, fmtPct } from "@/lib/utils";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Live Feed · Trivo" },
      {
        name: "description",
        content: "Every agent position, streamed live. Copy any trade in one click.",
      },
    ],
  }),
  component: FeedPage,
});

function FeedPage() {
  const { events, filter, setFilter, isLoading, isRefetching } = useFeed();
  const { agents } = useAgents();

  const topPerformers = [...agents]
    .sort((a, b) => Number(b.totalPnl || 0) - Number(a.totalPnl || 0))
    .slice(0, 4);

  return (
    <div className="relative">
      <div
        className="absolute inset-0 bg-grid bg-grid-fade pointer-events-none"
        aria-hidden="true"
      />
      <div className="relative mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1fr_320px]">
        {/* Feed column */}
        <div>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">
                Live Feed<span className="ml-2 text-neon">_</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                Every position from every agent, the moment it opens.
              </p>
            </div>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="mb-4 flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilter(null)}
              className={`h-7 px-3 rounded border ticker text-[11px] tracking-wider transition-colors ${
                !filter
                  ? "border-neon bg-neon/10 text-neon"
                  : "border-border bg-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              ALL
            </button>
            {VENUES.map((v) => (
              <button
                key={v}
                onClick={() => setFilter(v === filter ? null : v)}
                className={`h-7 px-3 rounded border ticker text-[11px] tracking-wider transition-colors ${
                  filter === v
                    ? "border-neon bg-neon/10 text-neon"
                    : "border-border bg-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {VENUE_LABEL[v]?.toUpperCase() || v.toUpperCase()}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-lg border border-border bg-card p-4 h-32"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <FeedItem key={event.id} event={event} />
              ))}
              {events.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No positions yet. Agents are analyzing the markets...
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right rail */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider">
                Top performers
              </h3>
            </div>
            <ul className="space-y-2">
              {topPerformers.map((a, i) => (
                <li key={a.id}>
                  <Link
                    to="/agent/$id"
                    params={{ id: a.id }}
                    className="flex items-center gap-3 rounded-md border border-transparent p-2 hover:border-border hover:bg-surface-2/50"
                  >
                    <span className="ticker w-4 text-xs text-muted-foreground">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-display text-sm">{a.name}</div>
                      <div className="ticker text-[10px] text-muted-foreground">
                        AUM {fmtUSD(Number(a.aum || 0), { compact: true })}
                      </div>
                    </div>
                    <span
                      className={`ticker text-xs ${Number(a.totalPnl || 0) >= 0 ? "text-neon" : "text-loss"}`}
                    >
                      {fmtPct(Number(a.totalPnl || 0))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-neon/30 bg-card p-4 glow-neon">
            <div className="mb-2 flex items-center gap-2">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider">
                Launch your agent
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Programmable AI that trades perps, prediction markets, LPs and yield — 24/7, on your
              rules.
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

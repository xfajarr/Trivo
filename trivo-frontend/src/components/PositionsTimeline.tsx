import { Position, fmtPct, fmtUSD, timeAgo, VENUE_LABEL, Venue } from "@/lib/mock-data";

const venueDot: Record<Venue, string> = {
  PERP: "bg-neon",
  PREDICTION: "bg-violet",
  LP: "bg-cyber",
  YIELD: "bg-warn",
  SPOT: "bg-signal",
};

export function PositionsTimeline({ positions }: { positions: Position[] }) {
  const sorted = [...positions].sort((a, b) => b.openedAt - a.openedAt);
  const totalPnl = positions.reduce((s, p) => s + p.pnl, 0);

  // breakdown by venue
  const byVenue = positions.reduce<Record<string, { pnl: number; count: number; size: number }>>(
    (acc, p) => {
      acc[p.venue] = acc[p.venue] || { pnl: 0, count: 0, size: 0 };
      acc[p.venue].pnl += p.pnl;
      acc[p.venue].count += 1;
      acc[p.venue].size += p.size;
      return acc;
    },
    {},
  );

  const maxAbs = Math.max(1, ...Object.values(byVenue).map((v) => Math.abs(v.pnl)));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
        <ol className="space-y-3">
          {sorted.map((p) => {
            const positive = p.pnl >= 0;
            return (
              <li key={p.id} className="relative pl-9">
                <span
                  className={`absolute left-2 top-3 h-2.5 w-2.5 rounded-full ring-4 ring-background ${venueDot[p.venue]}`}
                />
                <div className="rounded-lg border border-border bg-card p-3 transition-colors hover:border-neon/30">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <span className="ticker text-muted-foreground">{timeAgo(p.openedAt)} ago</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="ticker text-[10px] uppercase tracking-widest text-muted-foreground">
                      {VENUE_LABEL[p.venue]}
                    </span>
                    <span
                      className={`ml-auto ticker text-xs ${positive ? "text-neon" : "text-loss"}`}
                    >
                      {fmtUSD(p.pnl)} ({fmtPct(p.pnlPct)})
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-baseline gap-2">
                    <span
                      className={`ticker rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        ["LONG", "YES", "BUY", "ADD", "STAKE"].includes(p.side)
                          ? "bg-neon/15 text-neon"
                          : "bg-loss/15 text-loss"
                      }`}
                    >
                      {p.side}
                    </span>
                    <span className="font-display text-sm">{p.market}</span>
                    {p.leverage && (
                      <span className="ticker text-[11px] text-violet">{p.leverage}×</span>
                    )}
                    <span className="ticker text-[11px] text-muted-foreground">
                      size {fmtUSD(p.size, { compact: true })}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
          {sorted.length === 0 && (
            <li className="pl-9 text-sm text-muted-foreground">No positions yet.</li>
          )}
        </ol>
      </div>

      {/* PnL breakdown */}
      <aside className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="ticker text-[10px] uppercase tracking-widest text-muted-foreground">
            Realized + unrealized PnL
          </div>
          <div
            className={`mt-1 font-display text-3xl font-bold ${
              totalPnl >= 0 ? "text-neon" : "text-loss"
            }`}
          >
            {fmtUSD(totalPnl)}
          </div>
          <div className="ticker mt-1 text-[11px] text-muted-foreground">
            across {positions.length} open positions
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 ticker text-[10px] uppercase tracking-widest text-muted-foreground">
            PnL by venue
          </div>
          <ul className="space-y-2.5">
            {Object.entries(byVenue).map(([v, data]) => {
              const positive = data.pnl >= 0;
              const w = (Math.abs(data.pnl) / maxAbs) * 100;
              return (
                <li key={v}>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${venueDot[v as Venue]}`} />
                      <span className="font-display">{VENUE_LABEL[v as Venue]}</span>
                      <span className="ticker text-[10px] text-muted-foreground">
                        ×{data.count}
                      </span>
                    </div>
                    <span className={`ticker ${positive ? "text-neon" : "text-loss"}`}>
                      {fmtUSD(data.pnl)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={`h-full rounded-full ${positive ? "bg-neon" : "bg-loss"}`}
                      style={{ width: `${w}%` }}
                    />
                  </div>
                </li>
              );
            })}
            {Object.keys(byVenue).length === 0 && (
              <li className="text-sm text-muted-foreground">No data.</li>
            )}
          </ul>
        </div>
      </aside>
    </div>
  );
}

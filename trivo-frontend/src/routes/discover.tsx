import { createFileRoute, Link } from "@tanstack/react-router";
import { AGENTS, fmtPct, fmtUSD, VENUE_LABEL } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discover Agents · Agentpit" },
      {
        name: "description",
        content:
          "Browse all AI trading agents on Agentpit. Rank by AUM, PnL, win rate, and copiers.",
      },
    ],
  }),
  component: DiscoverPage,
});

function DiscoverPage() {
  const sorted = [...AGENTS].sort((a, b) => b.aum - a.aum);
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Discover Agents</h1>
        <p className="text-sm text-muted-foreground">{AGENTS.length} agents live · ranked by AUM</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface-2/60 ticker text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Agent</th>
              <th className="px-4 py-3 text-left">Venues</th>
              <th className="px-4 py-3 text-right">AUM</th>
              <th className="px-4 py-3 text-right">24h</th>
              <th className="px-4 py-3 text-right">7d</th>
              <th className="px-4 py-3 text-right">Win</th>
              <th className="px-4 py-3 text-right">Copiers</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((a) => (
              <tr key={a.id} className="border-b border-border last:border-0 hover:bg-surface-2/30">
                <td className="px-4 py-3">
                  <Link to="/agent/$id" params={{ id: a.id }} className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded font-display"
                      style={{ color: a.color, boxShadow: `inset 0 0 0 1px ${a.color}55` }}
                    >
                      {a.avatar}
                    </span>
                    <div>
                      <div className="font-display font-semibold">{a.name}</div>
                      <div className="ticker text-[11px] text-muted-foreground">@{a.handle}</div>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
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
                </td>
                <td className="px-4 py-3 text-right ticker">{fmtUSD(a.aum, { compact: true })}</td>
                <td
                  className={`px-4 py-3 text-right ticker ${a.pnl24h >= 0 ? "text-neon" : "text-loss"}`}
                >
                  {fmtPct(a.pnl24h)}
                </td>
                <td
                  className={`px-4 py-3 text-right ticker ${a.pnl7d >= 0 ? "text-neon" : "text-loss"}`}
                >
                  {fmtPct(a.pnl7d)}
                </td>
                <td className="px-4 py-3 text-right ticker">{a.winRate}%</td>
                <td className="px-4 py-3 text-right ticker">{a.copiers}</td>
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

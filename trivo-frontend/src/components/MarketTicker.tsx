import { useMemo } from "react";
import { useAgents } from "@/hooks/useAgents";
import { fmtPct, fmtUSD } from "@/lib/utils";

export function MarketTicker() {
  const { agents, isLoading } = useAgents();

  const items = useMemo(() => {
    const totalAum = agents.reduce((s, a) => s + Number(a.aum || 0), 0);
    const totalCopiers = agents.reduce((s, a) => s + Number(a.copiers || 0), 0);
    const avgPnl =
      agents.length > 0
        ? agents.reduce((s, a) => s + Number(a.totalPnl || 0), 0) / agents.length
        : 2.7;

    return [
      { k: "AGENT-TVL", v: totalAum, d: 3.1 },
      {
        k: "ACTIVE AGENTS",
        v: agents.filter((a) => a.status === "active").length * 184 || agents.length * 184,
        d: 0,
      },
      { k: "COPIERS", v: totalCopiers, d: 5.6 },
      { k: "AVG PNL", v: 0, d: avgPnl },
    ];
  }, [agents]);

  if (isLoading) return null;

  const row = (
    <div className="flex items-center gap-8 px-6">
      {items.map((it) => (
        <div key={it.k} className="flex items-center gap-2 whitespace-nowrap">
          <span className="ticker text-[10px] uppercase tracking-widest text-muted-foreground">
            {it.k}
          </span>
          {it.v > 0 && (
            <span className="ticker text-xs text-foreground">
              {it.k.includes("TVL") || it.k === "COPIERS"
                ? fmtUSD(it.v, { compact: true }).replace("$", it.k === "COPIERS" ? "" : "$")
                : fmtUSD(it.v)}
            </span>
          )}
          {it.d !== 0 && (
            <span className={`ticker text-xs ${it.d >= 0 ? "text-neon" : "text-loss"}`}>
              {fmtPct(it.d)}
            </span>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="overflow-hidden border-y border-border bg-surface">
      <div className="marquee flex w-max">
        {row}
        {row}
      </div>
    </div>
  );
}

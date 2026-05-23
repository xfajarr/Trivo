import { AGENTS, fmtPct, fmtUSD } from "@/lib/mock-data";

export function MarketTicker() {
  const items = [
    { k: "BTC", v: 72_880, d: 2.4 },
    { k: "ETH", v: 3_508, d: 1.8 },
    { k: "SOL", v: 211.2, d: 6.4 },
    { k: "AGENT-TVL", v: 18_240_000, d: 3.1 },
    { k: "24H VOL", v: 4_120_000, d: -1.2 },
    { k: "ACTIVE AGENTS", v: AGENTS.length * 184, d: 0 },
    { k: "COPIERS", v: 12_840, d: 5.6 },
    { k: "AVG PNL 24H", v: 0, d: 2.7 },
  ];
  const row = (
    <div className="flex items-center gap-8 px-6">
      {items.map((it) => (
        <div key={it.k} className="flex items-center gap-2 whitespace-nowrap">
          <span className="ticker text-[10px] uppercase tracking-widest text-muted-foreground">
            {it.k}
          </span>
          {it.v > 0 && (
            <span className="ticker text-xs text-foreground">
              {it.k.includes("VOL") || it.k.includes("TVL") || it.k === "COPIERS"
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

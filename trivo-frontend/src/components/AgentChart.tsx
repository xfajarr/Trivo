import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CrosshairMode, CandlestickSeries, createSeriesMarkers, type Time, type SeriesMarker } from "lightweight-charts";

interface TradeMarker {
  time: number; price: number; type: "entry" | "close";
  side: string; pnl?: number; reasoning?: string; size?: number;
}

const TIMEFRAMES = ["5m", "15m", "1h", "4h", "1d"];

export function AgentChart({ pair = "BTC/USD", trades, height = 320 }: { pair?: string; trades: TradeMarker[]; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [timeframe, setTimeframe] = useState("1h");
  const [hovered, setHovered] = useState<TradeMarker | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const chart = createChart(el, {
      width: el.clientWidth, height,
      layout: { background: { type: ColorType.Solid, color: "#09090b" }, textColor: "#71717a" },
      grid: { vertLines: { color: "#18181b" }, horzLines: { color: "#18181b" } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#27272a", scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: { borderColor: "#27272a", timeVisible: true },
    });

    const candles = generateRealisticCandles(trades, 80);
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e", downColor: "#ef4444",
      borderUpColor: "#22c55e", borderDownColor: "#ef4444",
      wickUpColor: "#71717a", wickDownColor: "#71717a",
    });
    series.setData(candles as any);

    if (trades.length > 0) {
      const markers = trades.map(t => ({
        time: t.time as Time,
        position: t.type === "entry" ? ("belowBar" as const) : ("inBar" as const),
        color: t.type === "entry" ? (["long","yes","add"].includes(t.side) ? "#22c55e" : "#ef4444") : ((t.pnl||0)>=0 ? "#22c55e" : "#ef4444"),
        shape: t.type === "entry" ? (["long","yes","add"].includes(t.side) ? "arrowUp" as const : "arrowDown" as const) : "circle" as const,
        text: t.type === "entry" ? (["long","yes","add"].includes(t.side) ? "B" : "S") : `${(t.pnl||0)>=0?"+":""}$${Math.abs(t.pnl||0).toFixed(0)}`,
        size: t.type === "entry" ? 2 : 1.5,
      }));
      createSeriesMarkers(series, markers as SeriesMarker<Time>[]);
    }
    chart.timeScale().fitContent();

    const onResize = () => { if (el) chart.applyOptions({ width: el.clientWidth }); };
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); chart.remove(); };
  }, [trades, height, timeframe]);

  const visibleTrades = trades.slice(-8).reverse();

  return (
    <div className="rounded-lg border border-border bg-[#09090b] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-semibold text-foreground">{pair}</span>
          <span className="ticker text-[10px] text-muted-foreground bg-surface-2/50 px-1.5 py-0.5 rounded">{trades.length} marks</span>
        </div>
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map(tf => (
            <button key={tf} onClick={() => setTimeframe(tf)}
              className={`h-6 px-2 rounded text-[10px] ticker tracking-wider transition-colors ${
                timeframe === tf ? "bg-neon/20 text-neon border border-neon/30" : "text-muted-foreground hover:text-foreground hover:bg-surface-2/50"
              }`}
            >{tf}</button>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="w-full" style={{ minHeight: height }} />

      {/* Trade timeline */}
      <div className="border-t border-border/50 px-3 py-2">
        <div className="flex items-center gap-3 overflow-x-auto">
          {visibleTrades.map((t, i) => (
            <div key={i} className="group relative shrink-0" onMouseEnter={() => setHovered(t)} onMouseLeave={() => setHovered(null)}>
              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ticker cursor-default ${
                t.type === "entry" 
                  ? ["long","yes","add"].includes(t.side) ? "bg-neon/10 text-neon border border-neon/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                  : (t.pnl||0) >= 0 ? "bg-neon/10 text-neon border border-neon/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
              }`}>
                <span className="font-semibold">{t.type === "entry" ? (["long","yes","add"].includes(t.side) ? "B" : "S") : (t.pnl||0)>=0 ? "W" : "L"}</span>
                <span className="text-[9px] opacity-70">${(t.price||0).toLocaleString()}</span>
              </div>
              {hovered === t && (
                <div className="absolute bottom-full left-0 mb-2 w-48 rounded-md border border-border bg-[#18181b] p-2.5 shadow-xl z-50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${t.type === "entry" ? (["long","yes","add"].includes(t.side) ? "bg-neon/10 text-neon" : "bg-red-500/10 text-red-500") : (t.pnl||0)>=0 ? "bg-neon/10 text-neon" : "bg-red-500/10 text-red-500"}`}>
                      {t.type === "entry" ? (["long","yes","add"].includes(t.side) ? "BUY" : "SELL") : "CLOSE"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{new Date(t.time * 1000).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span>
                  </div>
                  <div className="space-y-1 text-[10px] text-muted-foreground">
                    <div className="flex justify-between"><span>Price</span><span className="text-foreground font-semibold">${t.price.toLocaleString()}</span></div>
                    {t.size && <div className="flex justify-between"><span>Size</span><span className="text-foreground">${t.size}</span></div>}
                    {t.pnl !== undefined && <div className="flex justify-between"><span>PnL</span><span className={`font-semibold ${t.pnl>=0?"text-neon":"text-red-500"}`}>{t.pnl>=0?"+":""}${Math.abs(t.pnl).toFixed(2)}</span></div>}
                    {t.reasoning && <div className="mt-1 pt-1 border-t border-border/30 text-[9px] italic text-muted-foreground leading-relaxed">{t.reasoning.slice(0, 80)}</div>}
                  </div>
                </div>
              )}
            </div>
          ))}
          {trades.length === 0 && <span className="text-[10px] text-muted-foreground">No trades yet</span>}
        </div>
      </div>
    </div>
  );
}

// REALISTIC candlestick generation with proper OHLC ratios
function generateRealisticCandles(trades: TradeMarker[], count: number) {
  const now = Math.floor(Date.now() / 1000);
  const stepSec = 900; // 15 min candles

  if (!trades.length) {
    // Generate with trending + volatility
    const data: any[] = [];
    let price = 77000;
    let trend = 0;
    for (let i = count; i >= 0; i--) {
      trend = trend * 0.9 + (Math.random() - 0.5) * 80; // Mean-reverting trend
      const volatility = 40 + Math.random() * 60;
      const body = trend + (Math.random() - 0.5) * volatility * 0.6;
      const wickTop = Math.random() * volatility * 0.3;
      const wickBot = Math.random() * volatility * 0.3;
      const open = price;
      const close = price + body;
      price = close;
      data.push({ time: (now - i * stepSec) as Time, open, high: Math.max(open, close) + wickTop, low: Math.min(open, close) - wickBot, close });
    }
    return data;
  }

  const minT = Math.min(...trades.map(t => t.time)) - 86400 * 2;
  const maxT = Math.max(...trades.map(t => t.time)) + 86400;
  const step = Math.max(stepSec, (maxT - minT) / count);
  const baseP = trades[trades.length - 1]?.price || 77000;
  const data: any[] = [];
  let price = baseP * 0.95;
  let trend = 0;

  for (let i = 0; i < count; i++) {
    // Check if near a trade marker
    let nearTrade = false;
    for (const t of trades) {
      if (Math.abs((minT + i * step) - t.time) < step * 3) { price = t.price; nearTrade = true; break; }
    }

    if (!nearTrade) {
      trend = trend * 0.85 + (Math.random() - 0.5) * price * 0.001;
      const volatility = price * 0.001 + Math.random() * price * 0.002;
      const body = trend + (Math.random() - 0.5) * volatility;
      price += body;
    }

    const range = price * 0.003 + Math.random() * price * 0.004;
    const wickTop = Math.random() * range * 0.35;
    const wickBot = Math.random() * range * 0.35;
    const open = price - (Math.random() - 0.5) * range * 0.3;
    const close = price;
    data.push({
      time: (minT + i * step) as Time,
      open, high: Math.max(open, close) + wickTop,
      low: Math.min(open, close) - wickBot, close
    });
  }
  return data;
}

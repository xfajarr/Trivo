import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CrosshairMode, CandlestickSeries, createSeriesMarkers, type Time, type SeriesMarker } from "lightweight-charts";

interface TradeMarker {
  time: number; price: number; type: "entry" | "close";
  side: string; pnl?: number; reasoning?: string; size?: number;
}

const TIMEFRAMES = ["5m", "15m", "1h", "4h", "1d"];
const PAIRS = ["BTC/USD", "ETH/USD", "SOL/USD"];

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
      crosshair: { mode: CrosshairMode.Normal, vertLine: { color: "#27272a", labelBackgroundColor: "#18181b" }, horzLine: { color: "#27272a", labelBackgroundColor: "#18181b" } },
      rightPriceScale: { borderColor: "#27272a", scaleMargins: { top: 0.15, bottom: 0.15 } },
      timeScale: { borderColor: "#27272a", timeVisible: true, secondsVisible: false },
    });

    const candles = generateCandles(trades, 60, timeframe);
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e", downColor: "#ef4444", borderUpColor: "#22c55e", borderDownColor: "#ef4444",
      wickUpColor: "#22c55e", wickDownColor: "#ef4444",
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
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-semibold text-foreground">{pair}</span>
          <span className="ticker text-[10px] text-muted-foreground bg-surface-2/50 px-1.5 py-0.5 rounded">
            {trades.length} marks
          </span>
        </div>
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map(tf => (
            <button key={tf}
              onClick={() => setTimeframe(tf)}
              className={`h-6 px-2 rounded text-[10px] ticker tracking-wider transition-colors ${
                timeframe === tf ? "bg-neon/20 text-neon border border-neon/30" : "text-muted-foreground hover:text-foreground hover:bg-surface-2/50"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div ref={containerRef} className="w-full" style={{ minHeight: height }} />

      {/* Trade timeline */}
      <div className="border-t border-border/50 px-3 py-2">
        <div className="flex items-center gap-3 overflow-x-auto">
          {visibleTrades.map((t, i) => (
            <div key={i}
              className="group relative shrink-0"
              onMouseEnter={() => setHovered(t)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Badge */}
              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ticker cursor-default transition-opacity ${
                t.type === "entry" 
                  ? ["long","yes","add"].includes(t.side) ? "bg-neon/10 text-neon border border-neon/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                  : (t.pnl||0) >= 0 ? "bg-neon/10 text-neon border border-neon/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
              }`}>
                <span className="font-semibold">{t.type === "entry" ? (["long","yes","add"].includes(t.side) ? "B" : "S") : (t.pnl||0)>=0 ? "W" : "L"}</span>
                <span className="text-[9px] opacity-70">${(t.price||0).toLocaleString()}</span>
              </div>

              {/* Hover tooltip */}
              {hovered === t && (
                <div className="absolute bottom-full left-0 mb-2 w-48 rounded-md border border-border bg-[#18181b] p-2.5 shadow-xl z-50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${t.type === "entry" ? (["long","yes","add"].includes(t.side) ? "bg-neon/10 text-neon" : "bg-red-500/10 text-red-500") : (t.pnl||0)>=0 ? "bg-neon/10 text-neon" : "bg-red-500/10 text-red-500"}`}>
                      {t.type === "entry" ? (["long","yes","add"].includes(t.side) ? "BUY" : "SELL") : "CLOSE"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{new Date(t.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
          {trades.length === 0 && (
            <span className="text-[10px] text-muted-foreground">No trades yet</span>
          )}
        </div>
      </div>
    </div>
  );
}

function generateCandles(trades: TradeMarker[], count: number, _tf: string) {
  if (!trades.length) {
    const data: any[] = []; let price = 77000; const now = Math.floor(Date.now()/1000);
    for (let i = count; i >= 0; i--) {
      price += (Math.random() - 0.48) * 200;
      data.push({ time: (now - i*900) as Time, open: price-80, high: price+150, low: Math.max(0,price-200), close: price });
    }
    return data;
  }
  const minT = Math.min(...trades.map(t=>t.time)) - 86400;
  const maxT = Math.max(...trades.map(t=>t.time)) + 86400;
  const baseP = trades[trades.length-1]?.price || 77000;
  const step = Math.max(60, (maxT - minT) / count);
  const data: any[] = []; let price = baseP * 0.95;
  for (let i = 0; i < count; i++) {
    price += (Math.random() - 0.48) * price * 0.015;
    for (const t of trades) { if (Math.abs((minT + i*step) - t.time) < step*2) { price = t.price; break; } }
    data.push({ time: (minT + i*step) as Time, open: price*0.998, high: price*1.004, low: Math.max(0,price*0.993), close: price });
  }
  return data;
}

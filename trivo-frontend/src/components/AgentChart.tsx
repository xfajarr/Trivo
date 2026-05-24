import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CrosshairMode, CandlestickSeries, createSeriesMarkers, type Time, type SeriesMarker } from "lightweight-charts";

interface TradeMarker { time: number; price: number; type: "entry" | "close"; side: string; pnl?: number; reasoning?: string; size?: number; }

const TIMEFRAMES = ["5m", "15m", "1h", "4h", "1d"];

export function AgentChart({ pair = "BTC/USD", trades, height = 320 }: { pair?: string; trades: TradeMarker[]; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [timeframe, setTimeframe] = useState("1h");
  const [hovered, setHovered] = useState<TradeMarker | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current || !trades.length) return;
    const el = containerRef.current;
    const chart = createChart(el, {
      width: el.clientWidth, height,
      layout: { background: { type: ColorType.Solid, color: "#09090b" }, textColor: "#71717a" },
      grid: { vertLines: { color: "#18181b" }, horzLines: { color: "#18181b" } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#27272a", scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: { borderColor: "#27272a", timeVisible: true },
    });

    const candles = generateCandles(trades, 80);
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e", downColor: "#ef4444", borderUpColor: "#22c55e", borderDownColor: "#ef4444",
      wickUpColor: "#71717a", wickDownColor: "#71717a",
    });
    series.setData(candles as any);

    // Deduplicate markers — only 1 per trade
    const seen = new Set<string>();
    const markers = trades.filter(t => {
      const key = `${t.type}-${t.time}-${t.price}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map(t => ({
      time: t.time as Time,
      position: t.type === "entry" ? ("belowBar" as const) : ("inBar" as const),
      color: t.type === "entry" ? (["long","yes","add"].includes(t.side) ? "#22c55e" : "#ef4444") : ((t.pnl||0)>=0 ? "#22c55e" : "#ef4444"),
      shape: t.type === "entry" ? (["long","yes","add"].includes(t.side) ? "arrowUp" as const : "arrowDown" as const) : "circle" as const,
      text: t.type === "entry" ? (["long","yes","add"].includes(t.side) ? "B" : "S") : "",
      size: 2,
    }));

    if (markers.length) createSeriesMarkers(series, markers as SeriesMarker<Time>[]);
    chart.timeScale().fitContent();

    const onResize = () => { if (el) chart.applyOptions({ width: el.clientWidth }); };
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); chart.remove(); };
  }, [trades, height, timeframe]);

  // Deduplicate for timeline too
  const seen = new Set<string>();
  const uniqueTrades = trades.filter(t => {
    const key = `${t.type}-${t.time}-${t.price}`;
    if (seen.has(key)) return false; seen.add(key); return true;
  }).slice(-8).reverse();

  return (
    <div className="rounded-lg border border-border bg-[#09090b] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-semibold text-foreground">{pair}</span>
          <span className="ticker text-[10px] text-muted-foreground bg-surface-2/50 px-1.5 py-0.5 rounded">{uniqueTrades.length} marks</span>
        </div>
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map(tf => (
            <button key={tf} onClick={() => setTimeframe(tf)} className={`h-6 px-2 rounded text-[10px] ticker tracking-wider transition-colors ${timeframe === tf ? "bg-neon/20 text-neon border border-neon/30" : "text-muted-foreground hover:text-foreground hover:bg-surface-2/50"}`}>{tf}</button>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="w-full" style={{ minHeight: height }} />
      <div className="border-t border-border/50 px-3 py-2">
        <div className="flex items-center gap-3 overflow-x-auto">
          {uniqueTrades.map((t, i) => (
            <div key={i} className="group relative shrink-0"
              onMouseEnter={(e) => { setHovered(t); const rect = (e.target as HTMLElement).getBoundingClientRect(); setTooltipPos({ x: rect.left, y: rect.top - 8 }); }}
              onMouseLeave={() => setHovered(null)}
            >
              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ticker cursor-default border ${
                t.type === "entry" ? (["long","yes","add"].includes(t.side) ? "bg-neon/10 text-neon border-neon/20" : "bg-red-500/10 text-red-500 border-red-500/20")
                : (t.pnl||0) >= 0 ? "bg-neon/10 text-neon border-neon/20" : "bg-red-500/10 text-red-500 border-red-500/20"
              }`}>
                <span className="font-semibold">{t.type === "entry" ? (["long","yes","add"].includes(t.side) ? "B" : "S") : (t.pnl||0)>=0 ? "W" : "L"}</span>
                <span className="text-[9px] opacity-70">${(t.price||0).toLocaleString()}</span>
              </div>
            </div>
          ))}
          {uniqueTrades.length === 0 && <span className="text-[10px] text-muted-foreground">No trades yet</span>}
        </div>
      </div>

      {/* Floating tooltip */}
      {hovered && (
        <div className="fixed z-50 w-48 rounded-md border border-border bg-[#18181b] p-2.5 shadow-xl" style={{ left: tooltipPos.x, top: tooltipPos.y - 120 }}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${hovered.type === "entry" ? (["long","yes","add"].includes(hovered.side) ? "bg-neon/10 text-neon" : "bg-red-500/10 text-red-500") : (hovered.pnl||0)>=0 ? "bg-neon/10 text-neon" : "bg-red-500/10 text-red-500"}`}>
              {hovered.type === "entry" ? (["long","yes","add"].includes(hovered.side) ? "BUY" : "SELL") : "CLOSE"}
            </span>
            <span className="text-[10px] text-muted-foreground">{new Date(hovered.time * 1000).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</span>
          </div>
          <div className="space-y-1 text-[10px] text-muted-foreground">
            <div className="flex justify-between"><span>Price</span><span className="text-foreground font-semibold">${hovered.price.toLocaleString()}</span></div>
            {hovered.size && <div className="flex justify-between"><span>Size</span><span className="text-foreground">${hovered.size}</span></div>}
            {hovered.pnl !== undefined && <div className="flex justify-between"><span>PnL</span><span className={`font-semibold ${hovered.pnl>=0?"text-neon":"text-red-500"}`}>{hovered.pnl>=0?"+":""}${Math.abs(hovered.pnl).toFixed(2)}</span></div>}
            {hovered.reasoning && <div className="mt-1 pt-1 border-t border-border/30 text-[9px] italic text-muted-foreground leading-relaxed">{hovered.reasoning.slice(0, 80)}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function generateCandles(trades: TradeMarker[], count: number) {
  const now = Math.floor(Date.now()/1000); const step = 900;
  if (!trades.length) {
    const data: any[] = []; let p = 77000;
    for (let i = count; i >= 0; i--) {
      const r = p * 0.003; p += (Math.random()-0.48) * p * 0.002;
      data.push({ time: (now - i*step) as Time, open: p - r*0.3, high: p + r*0.2, low: Math.max(0, p - r*0.4), close: p });
    }
    return data;
  }
  const minT = Math.min(...trades.map(t=>t.time))-86400; const maxT = Math.max(...trades.map(t=>t.time))+86400;
  const baseP = trades[trades.length-1]?.price||77000; const st = Math.max(60, (maxT-minT)/count);
  const data: any[] = []; let p = baseP*0.95;
  for (let i = 0; i < count; i++) {
    const r = p * 0.003; p += (Math.random()-0.48) * p * 0.002;
    for (const t of trades) { if (Math.abs((minT+i*st)-t.time) < st*3) { p = t.price; break; } }
    data.push({ time: (minT+i*st) as Time, open: p - r*0.3, high: p + r*0.2, low: Math.max(0, p - r*0.4), close: p });
  }
  return data;
}

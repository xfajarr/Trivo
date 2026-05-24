import { useEffect, useRef } from "react";
import { createChart, ColorType, CrosshairMode, CandlestickSeries, createSeriesMarkers, type Time, type SeriesMarker } from "lightweight-charts";

interface TradeMarker {
  time: number;
  price: number;
  type: "entry" | "close";
  side: string;
  pnl?: number;
  reasoning?: string;
  size?: number;
}

interface Props { pair?: string; trades: TradeMarker[]; height?: number }

export function AgentChart({ pair = "BTC/USD", trades, height = 300 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;

    const chart = createChart(el, {
      width: el.clientWidth,
      height,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#a1a1aa" },
      grid: { vertLines: { color: "#27272a" }, horzLines: { color: "#27272a" } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#3f3f46" },
      timeScale: { borderColor: "#3f3f46", timeVisible: true },
    });

    const candles = generateCandles(trades, 50);
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e", downColor: "#ef4444",
      borderUpColor: "#22c55e", borderDownColor: "#ef4444",
      wickUpColor: "#22c55e", wickDownColor: "#ef4444",
    });
    candleSeries.setData(candles as any);

    // Markers
    const markers: any[] = [];
    for (const t of trades) {
      const isLong = ["long","yes","add"].includes(t.side);
      if (t.type === "entry") {
        markers.push({ time: t.time as Time, position: isLong ? "belowBar" : "aboveBar", color: isLong ? "#22c55e" : "#ef4444", shape: isLong ? "arrowUp" : "arrowDown", text: `${t.side.toUpperCase()}`, size: 3 });
      }
      if (t.type === "close") {
        markers.push({ time: t.time as Time, position: "inBar", color: (t.pnl || 0) >= 0 ? "#22c55e" : "#ef4444", shape: "circle", text: `${(t.pnl||0)>=0?"+":""}$${Math.abs(t.pnl||0).toFixed(0)}`, size: 2 });
      }
    }
    if (markers.length) {
      const markersPlugin = createSeriesMarkers(candleSeries, markers as SeriesMarker<Time>[]);
    }
    chart.timeScale().fitContent();

    const onResize = () => { if (el) chart.applyOptions({ width: el.clientWidth }); };
    window.addEventListener("resize", onResize);

    return () => { window.removeEventListener("resize", onResize); chart.remove(); };
  }, [trades, height]);

  return (
    <div className="rounded-lg border border-border bg-card/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-display text-sm font-semibold">{pair}</span>
        <span className="ticker text-[10px] text-muted-foreground">{trades.length} trades</span>
      </div>
      <div ref={containerRef} className="w-full" style={{ minHeight: height }} />
      {trades.length > 0 && (
        <div className="mt-3 space-y-1 max-h-28 overflow-y-auto">
          {trades.slice(-5).reverse().map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className={`ticker w-10 text-right font-semibold ${t.type === "entry" ? "text-neon" : (t.pnl||0) >= 0 ? "text-neon" : "text-loss"}`}>{t.type === "entry" ? "IN" : "OUT"}</span>
              <span className="ticker text-muted-foreground">${t.price.toLocaleString()}</span>
              {t.pnl !== undefined && <span className={`ticker font-semibold ${t.pnl>=0?"text-neon":"text-loss"}`}>{t.pnl>=0?"+":""}${Math.abs(t.pnl).toFixed(2)}</span>}
              {t.reasoning && <span className="ticker text-[10px] text-muted-foreground truncate italic">{t.reasoning.slice(0, 50)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function generateCandles(trades: TradeMarker[], count: number) {
  if (!trades.length) {
    const data: any[] = []; let price = 77000; const now = Math.floor(Date.now()/1000);
    for (let i = count; i >= 0; i--) {
      price += (Math.random() - 0.48) * 200;
      data.push({ time: (now - i*3600) as Time, open: price-50, high: price+100, low: Math.max(0,price-150), close: price });
    }
    return data;
  }
  const minT = Math.min(...trades.map(t=>t.time)) - 86400;
  const maxT = Math.max(...trades.map(t=>t.time)) + 86400;
  const baseP = trades[trades.length-1]?.price || 77000;
  const step = (maxT - minT) / count;
  const data: any[] = []; let price = baseP * 0.95;
  for (let i = 0; i < count; i++) {
    price += (Math.random() - 0.48) * price * 0.02;
    for (const t of trades) { if (Math.abs((minT + i*step) - t.time) < step) { price = t.price; break; } }
    data.push({ time: (minT + i*step) as Time, open: price*0.998, high: price*1.005, low: Math.max(0,price*0.992), close: price });
  }
  return data;
}

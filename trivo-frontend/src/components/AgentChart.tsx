import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  createSeriesMarkers,
  type Time,
  type SeriesMarker,
} from "lightweight-charts";

interface TradeMarker {
  time: number;
  price: number;
  type: "entry" | "close";
  side: string;
  pnl?: number;
  reasoning?: string;
  size?: number;
}

const TIMEFRAMES = ["5m", "15m", "1h", "4h", "1d"];

// WebSocket real-time price via data-api + ezmodePriceInfo
function useSpeedTradingPrice(symbol: string) {
  const [price, setPrice] = useState<number | null>(null);
  const [change24h, setChange24h] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const wsUrl = "wss://data-api.speedtrading.pandora.fun/ws/?EIO=4&transport=websocket";
    const ws = new WebSocket(wsUrl);
    let pingInterval: ReturnType<typeof setInterval>;

    ws.onopen = () => {};

    ws.onmessage = (event) => {
      const msg = event.data as string;
      if (msg.startsWith("0")) {
        ws.send("40");
        return;
      }
      if (msg.startsWith("40")) {
        setConnected(true);
        // KEY: second arg must be JSON STRING
        ws.send('42' + JSON.stringify(['subscribe', '{"method":"ezmodePriceInfo"}']));
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send("2");
        }, 25000);
        return;
      }
      if (msg.startsWith("42")) {
        try {
          const payload = JSON.parse(msg.slice(2));
          const [, data] = payload;
          if (data?.event === "ezmodePriceInfo" && data?.data) {
            const market = data.data[symbol];
            if (market?.indexPrice) setPrice(market.indexPrice);
          }
        } catch (e) {}
      }
    };

    ws.onclose = () => {
      setConnected(false);
      if (pingInterval) clearInterval(pingInterval);
    };
    ws.onerror = () => setConnected(false);

    return () => {
      if (pingInterval) clearInterval(pingInterval);
      ws.close();
    };
  }, [symbol]);

  return { price, change24h, connected };
}

function generateCandles(trades: TradeMarker[], basePrice: number, count = 80) {
  const now = Math.floor(Date.now() / 1000);
  const step = 900; // 15 min per candle

  if (!trades.length) {
    const data: any[] = [];
    let p = basePrice || 77000;
    for (let i = count; i >= 0; i--) {
      const r = p * 0.003;
      p += (Math.random() - 0.48) * p * 0.002;
      data.push({
        time: (now - i * step) as Time,
        open: p - r * 0.3,
        high: p + r * 0.2,
        low: Math.max(0, p - r * 0.4),
        close: p,
      });
    }
    return data;
  }

  const minT = Math.min(...trades.map((t) => t.time)) - 86400;
  const maxT = Math.max(...trades.map((t) => t.time)) + 86400;
  const baseP = trades[trades.length - 1]?.price || basePrice || 77000;
  const st = Math.max(60, (maxT - minT) / count);
  const data: any[] = [];
  let p = baseP * 0.95;

  for (let i = 0; i < count; i++) {
    const r = p * 0.003;
    p += (Math.random() - 0.48) * p * 0.002;
    for (const t of trades) {
      if (Math.abs((minT + i * st) - t.time) < st * 3) {
        p = t.price;
        break;
      }
    }
    data.push({
      time: (minT + i * st) as Time,
      open: p - r * 0.3,
      high: p + r * 0.2,
      low: Math.max(0, p - r * 0.4),
      close: p,
    });
  }
  return data;
}

export function AgentChart({
  pair = "BTC/USD",
  trades,
  height = 400,
}: {
  pair?: string;
  trades: TradeMarker[];
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [timeframe, setTimeframe] = useState("1h");
  const [hovered, setHovered] = useState<TradeMarker | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const symbol = pair.split("/")[0];
  const { price: livePrice, connected } = useSpeedTradingPrice(symbol);

  const currentPrice = livePrice || (trades.length > 0 ? trades[trades.length - 1].price : null);

  // Render chart
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const chart = createChart(el, {
      width: el.clientWidth,
      height,
      layout: { background: { type: 0 as const, color: "#09090b" }, textColor: "#71717a" },
      grid: { vertLines: { color: "#18181b" }, horzLines: { color: "#18181b" } },
      crosshair: { mode: 0 as const },
      rightPriceScale: { borderColor: "#27272a", scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: { borderColor: "#27272a", timeVisible: true },
    });

    const basePrice = currentPrice || 77000;
    const candles = generateCandles(trades, basePrice, 80);
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#71717a",
      wickDownColor: "#71717a",
    });
    series.setData(candles as any);

    // Deduplicate markers
    const seen = new Set<string>();
    const markers = trades
      .filter((t) => {
        const key = `${t.type}-${t.time}-${t.price}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((t) => ({
        time: t.time as Time,
        position: t.type === "entry" ? ("belowBar" as const) : ("inBar" as const),
        color:
          t.type === "entry"
            ? ["long", "yes", "add"].includes(t.side)
              ? "#22c55e"
              : "#ef4444"
            : (t.pnl || 0) >= 0
              ? "#22c55e"
              : "#ef4444",
        shape:
          t.type === "entry"
            ? (["long", "yes", "add"].includes(t.side) ? "arrowUp" as const : "arrowDown" as const)
            : "circle" as const,
        text: t.type === "entry" ? (["long", "yes", "add"].includes(t.side) ? "B" : "S") : "",
        size: 2,
      }));

    if (markers.length) createSeriesMarkers(series, markers as SeriesMarker<Time>[]);
    chart.timeScale().fitContent();

    const onResize = () => {
      if (el) chart.applyOptions({ width: el.clientWidth });
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
    };
  }, [trades, height, timeframe, currentPrice]);

  // Deduplicate for timeline
  const seen = new Set<string>();
  const uniqueTrades = trades
    .filter((t) => {
      const key = `${t.type}-${t.time}-${t.price}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(-8)
    .reverse();

  return (
    <div className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div>
            <span className="font-display text-sm font-bold text-foreground">{pair}</span>
            <div className="flex items-center gap-2 mt-0.5">
              {currentPrice !== null && (
                <span className="font-mono text-xs text-foreground font-semibold">
                  ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
              <span className="flex items-center gap-1">
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${
                    connected ? "bg-neon animate-pulse" : "bg-muted-foreground/30"
                  }`}
                />
                <span className="ticker text-[9px] text-muted-foreground/60 uppercase tracking-wider">
                  {connected ? "Live" : "Offline"}
                </span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`h-6 px-2 rounded text-[10px] ticker tracking-wider transition-colors ${
                timeframe === tf
                  ? "bg-neon/20 text-neon border border-neon/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-2/50"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div ref={containerRef} className="w-full" style={{ minHeight: height }} />

      {/* Timeline */}
      <div className="border-t border-border/50 px-3 py-2">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
          {uniqueTrades.map((t, i) => (
            <div
              key={i}
              className="group relative shrink-0"
              onMouseEnter={(e) => {
                setHovered(t);
                const rect = (e.target as HTMLElement).getBoundingClientRect();
                setTooltipPos({ x: rect.left, y: rect.top - 8 });
              }}
              onMouseLeave={() => setHovered(null)}
            >
              <div
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ticker cursor-default border ${
                  t.type === "entry"
                    ? ["long", "yes", "add"].includes(t.side)
                      ? "bg-neon/10 text-neon border-neon/20"
                      : "bg-red-500/10 text-red-500 border-red-500/20"
                    : (t.pnl || 0) >= 0
                      ? "bg-neon/10 text-neon border-neon/20"
                      : "bg-red-500/10 text-red-500 border-red-500/20"
                }`}
              >
                <span className="font-semibold">
                  {t.type === "entry"
                    ? ["long", "yes", "add"].includes(t.side)
                      ? "B"
                      : "S"
                    : (t.pnl || 0) >= 0
                      ? "W"
                      : "L"}
                </span>
                <span className="text-[9px] opacity-70">
                  ${(t.price || 0).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
          {uniqueTrades.length === 0 && (
            <span className="text-[10px] text-muted-foreground/50">No trades yet</span>
          )}
        </div>
      </div>

      {/* Floating tooltip */}
      {hovered && (
        <div
          className="fixed z-50 w-48 rounded-md border border-border bg-[#18181b] p-2.5 shadow-xl"
          style={{ left: tooltipPos.x, top: tooltipPos.y - 120 }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                hovered.type === "entry"
                  ? ["long", "yes", "add"].includes(hovered.side)
                    ? "bg-neon/10 text-neon"
                    : "bg-red-500/10 text-red-500"
                  : (hovered.pnl || 0) >= 0
                    ? "bg-neon/10 text-neon"
                    : "bg-red-500/10 text-red-500"
              }`}
            >
              {hovered.type === "entry"
                ? ["long", "yes", "add"].includes(hovered.side)
                  ? "BUY"
                  : "SELL"
                : "CLOSE"}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {new Date(hovered.time * 1000).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div className="space-y-1 text-[10px] text-muted-foreground">
            <div className="flex justify-between">
              <span>Price</span>
              <span className="text-foreground font-semibold">
                ${hovered.price.toLocaleString()}
              </span>
            </div>
            {hovered.size && (
              <div className="flex justify-between">
                <span>Size</span>
                <span className="text-foreground">${hovered.size}</span>
              </div>
            )}
            {hovered.pnl !== undefined && (
              <div className="flex justify-between">
                <span>PnL</span>
                <span
                  className={`font-semibold ${
                    hovered.pnl >= 0 ? "text-neon" : "text-red-500"
                  }`}
                >
                  {hovered.pnl >= 0 ? "+" : ""}${Math.abs(hovered.pnl).toFixed(2)}
                </span>
              </div>
            )}
            {hovered.reasoning && (
              <div className="mt-1 pt-1 border-t border-border/30 text-[9px] italic text-muted-foreground leading-relaxed">
                {hovered.reasoning.slice(0, 80)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

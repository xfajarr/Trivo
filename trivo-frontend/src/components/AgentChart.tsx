import { useEffect, useMemo, useRef } from "react";
import type {
  CandlestickSeriesPartialOptions,
  IChartApi,
  SeriesMarker,
  Time,
} from "lightweight-charts";
import { ColorType } from "lightweight-charts";
import type { Candle } from "@/lib/api";

interface TradeMarker {
  id?: string;
  time: number;
  price: number;
  type: "entry" | "close";
  side: string;
  pnl?: number;
  reasoning?: string;
  size?: number;
}

const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"];

export function AgentChart({
  pair = "BTC/USD",
  candles,
  trades,
  timeframe,
  onTimeframeChange,
  height = 400,
  isLoading = false,
}: {
  pair?: string;
  candles: Candle[];
  trades: TradeMarker[];
  timeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  height?: number;
  isLoading?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const currentPrice = candles.at(-1)?.close ?? trades.at(-1)?.price ?? null;

  const chartCandles = useMemo(
    () =>
      candles.map((candle) => ({
        time: candle.time as Time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      })),
    [candles],
  );

  const markers = useMemo(() => {
    const seen = new Set<string>();
    return trades
      .filter((trade) => {
        const key = `${trade.type}-${trade.time}-${trade.price}-${trade.side}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((trade) => ({
        time: trade.time as Time,
        position: trade.type === "entry" ? ("belowBar" as const) : ("inBar" as const),
        color:
          trade.type === "entry"
            ? ["long", "yes", "add"].includes(trade.side)
              ? "#22c55e"
              : "#ef4444"
            : (trade.pnl || 0) >= 0
              ? "#22c55e"
              : "#ef4444",
        shape:
          trade.type === "entry"
            ? ["long", "yes", "add"].includes(trade.side)
              ? ("arrowUp" as const)
              : ("arrowDown" as const)
            : ("circle" as const),
        text:
          trade.type === "entry"
            ? `${trade.side.toUpperCase()} ${trade.reasoning ? `· ${trade.reasoning}` : ""}`.trim()
            : trade.pnl !== undefined
              ? `${trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}`
              : "",
        size: 2,
      })) as SeriesMarker<Time>[];
  }, [trades]);

  useEffect(() => {
    if (!containerRef.current) return;
    let chart: IChartApi | null = null;
    let alive = true;
    let onResize: (() => void) | null = null;

    void (async () => {
      const { createChart, CandlestickSeries, createSeriesMarkers } =
        await import("lightweight-charts");
      if (!alive || !containerRef.current) return;

      const el = containerRef.current;
      chart = createChart(el, {
        width: el.clientWidth,
        height,
        layout: { background: { type: ColorType.Solid, color: "#09090b" }, textColor: "#71717a" },
        grid: { vertLines: { color: "#18181b" }, horzLines: { color: "#18181b" } },
        crosshair: { mode: 0 as const },
        rightPriceScale: { borderColor: "#27272a", scaleMargins: { top: 0.1, bottom: 0.1 } },
        timeScale: { borderColor: "#27272a", timeVisible: true },
      });

      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderUpColor: "#22c55e",
        borderDownColor: "#ef4444",
        wickUpColor: "#71717a",
        wickDownColor: "#71717a",
      } as CandlestickSeriesPartialOptions);

      if (chartCandles.length > 0) {
        series.setData(chartCandles);
        if (markers.length) createSeriesMarkers(series, markers);
        chart.timeScale().fitContent();
      }

      onResize = () => chart?.applyOptions({ width: el.clientWidth });
      window.addEventListener("resize", onResize);
    })();

    return () => {
      alive = false;
      if (onResize) window.removeEventListener("resize", onResize);
      chart?.remove();
      chart = null;
      onResize = null;
    };
  }, [chartCandles, markers, height]);

  return (
    <div className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-b border-border/50">
        <div>
          <span className="font-display text-sm font-bold text-foreground">{pair}</span>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="font-mono text-xs text-foreground font-semibold">
              {currentPrice !== null
                ? `$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : "Waiting for candles..."}
            </span>
            {isLoading ? (
              <span className="ticker text-[9px] text-muted-foreground/60 uppercase tracking-wider">
                Loading
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
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

      <div ref={containerRef} className="w-full" style={{ height }} />

      {!isLoading && chartCandles.length === 0 ? (
        <div className="flex h-[360px] items-center justify-center border-t border-border/50 text-sm text-muted-foreground">
          Waiting for market candles...
        </div>
      ) : null}
    </div>
  );
}

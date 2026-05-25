import { useEffect, useMemo, useRef } from "react";
import type {
  CandlestickSeriesPartialOptions,
  IChartApi,
  SeriesMarker,
  Time,
} from "lightweight-charts";
import { ColorType, LineStyle } from "lightweight-charts";
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

const TIMEFRAMES = ["4h", "1d"];
const RECOMMENDED_TIMEFRAME = "4h";

function formatPair(pair: string): string {
  return pair.replace(/\/USD$/i, "-USDC").replace("/", "-").toUpperCase();
}

function formatPrice(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "--";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: value >= 1_000 ? 0 : 2,
  });
}

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
      candles.map((c) => ({
        time: c.time as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    [candles],
  );

  const markers = useMemo(() => {
    const seen = new Set<string>();
    return trades
      .filter((t) => {
        const key = `${t.type}-${t.time}-${t.side}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((t) => {
        const isLong = ["long", "yes", "add", "buy"].includes(t.side.toLowerCase());
        const isEntry = t.type === "entry";
        const isProfitable = (t.pnl || 0) >= 0;

        if (isEntry) {
          return {
            time: t.time as Time,
            position: isLong ? ("belowBar" as const) : ("aboveBar" as const),
            color: isLong ? "#49b84f" : "#ef3024",
            shape: "square" as const,
            text: isLong ? "B" : "S",
            size: 1,
          };
        }

        return {
          time: t.time as Time,
          position: isProfitable ? ("belowBar" as const) : ("aboveBar" as const),
          color: isProfitable ? "#49b84f" : "#ef3024",
          shape: "square" as const,
          text: "E",
          size: 1,
        };
      }) as SeriesMarker<Time>[];
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
        autoSize: true,
        layout: {
          background: { type: ColorType.Solid, color: "#fbfdf8" },
          textColor: "#102a14",
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 12,
        },
        grid: {
          vertLines: { color: "rgba(15, 42, 20, 0.08)" },
          horzLines: { color: "rgba(15, 42, 20, 0.08)" },
        },
        crosshair: {
          mode: 1 as const,
          vertLine: { color: "rgba(15, 42, 20, 0.22)", width: 1, style: LineStyle.Dashed },
          horzLine: { color: "rgba(15, 42, 20, 0.22)", width: 1, style: LineStyle.Dashed },
        },
        localization: {
          priceFormatter: (price: number) => formatPrice(price),
        },
        rightPriceScale: {
          borderColor: "#102a14",
          textColor: "#102a14",
          scaleMargins: { top: 0.08, bottom: 0.1 },
        },
        timeScale: {
          borderColor: "#102a14",
          timeVisible: true,
          secondsVisible: false,
          rightOffset: 1,
          barSpacing: 7,
        },
        handleScroll: true,
        handleScale: true,
      });

      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#4caf50",
        downColor: "#ff4b38",
        borderUpColor: "#4caf50",
        borderDownColor: "#ff4b38",
        wickUpColor: "#4caf50",
        wickDownColor: "#ff4b38",
        priceLineVisible: true,
        priceLineColor: "#ef3024",
        priceLineStyle: LineStyle.Dotted,
        priceLineWidth: 1,
        lastValueVisible: true,
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
    <div className="rounded-2xl border border-[#dfe7dc] bg-[#fbfdf8] p-6 shadow-[0_18px_60px_rgba(15,42,20,0.08)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight text-[#0b2a12]">
            {formatPair(pair)}
          </h2>
          <p className="mt-1 font-mono text-[11px] tabular-nums text-[#55705b]">
            Last {formatPrice(currentPrice)} · Signals overlay
          </p>
        </div>

        <div className="flex items-center gap-2" aria-label="Chart timeframe controls">
          {TIMEFRAMES.map((tf) => {
            const isActive = timeframe === tf;
            const isRecommended = tf === RECOMMENDED_TIMEFRAME;
            return (
              <button
                key={tf}
                type="button"
                onClick={() => onTimeframeChange(tf)}
                className={`inline-flex min-h-9 items-center gap-1 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b7ff2a] focus-visible:ring-offset-2 ${
                  isActive || isRecommended
                    ? "bg-[#c8ff2d] text-[#245000] shadow-sm hover:bg-[#baff1e]"
                    : "bg-[#eef1f0] text-[#334238] hover:bg-[#e3e8e4]"
                }`}
                aria-pressed={isActive}
              >
                {tf.toUpperCase()}
                {isRecommended && (
                  <span className="rounded-full bg-[#408b08] px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
                    Recommended
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-sm bg-[#fbfdf8]">
        <div ref={containerRef} className="w-full" style={{ height }} />

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#fbfdf8]/70 backdrop-blur-[1px]">
            <span className="rounded-full border border-[#dfe7dc] bg-white/80 px-3 py-1 text-xs font-medium text-[#55705b] shadow-sm">
              Loading candles…
            </span>
          </div>
        )}

        {!isLoading && chartCandles.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-[#55705b]">
            Waiting for market candles…
          </div>
        )}
      </div>
    </div>
  );
}

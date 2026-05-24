import { useQuery } from "@tanstack/react-query";
import { marketApi } from "@/lib/api";

export function useMarketCandles(symbol: string, timeframe: string, limit = 160) {
  return useQuery({
    queryKey: ["market-candles", symbol, timeframe, limit],
    queryFn: () => marketApi.candles({ symbol, timeframe, limit }),
    enabled: !!symbol && !!timeframe,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
}

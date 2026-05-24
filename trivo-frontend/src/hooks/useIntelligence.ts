import { useQuery } from "@tanstack/react-query";
import { intelligenceApi } from "@/lib/api";

export function useAgentDecisions(agentId: string) {
  return useQuery({
    queryKey: ["intelligence-decisions", agentId],
    queryFn: () => intelligenceApi.decisions(agentId),
    enabled: !!agentId,
    refetchInterval: 15_000,
  });
}

export function useAgentScorecard(agentId: string) {
  return useQuery({
    queryKey: ["intelligence-scorecard", agentId],
    queryFn: () => intelligenceApi.scorecard(agentId),
    enabled: !!agentId,
    refetchInterval: 30_000,
  });
}

export function useMarketRegimes(symbol = "BTC/USD", timeframe = "1h") {
  return useQuery({
    queryKey: ["market-regimes", symbol, timeframe],
    queryFn: () => intelligenceApi.regimes({ symbol, timeframe }),
    refetchInterval: 30_000,
  });
}

export function useSkillPacks() {
  return useQuery({
    queryKey: ["skill-packs"],
    queryFn: intelligenceApi.skillPacks,
    staleTime: 60_000,
  });
}

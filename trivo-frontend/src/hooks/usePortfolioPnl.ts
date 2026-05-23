import { useQuery } from "@tanstack/react-query";
import { pnlApi } from "@/lib/api";

/**
 * Shared hook for unrealized PnL across all pages.
 * Same queryKey = TanStack Query shares cache automatically.
 * 10s polling = near real-time.
 */
export function usePortfolioPnl(agentIds: string[]) {
  return useQuery({
    queryKey: ["pnl-summary"],  // Shared key across all pages
    queryFn: async () => {
      const results: Record<string, { unrealizedPnl: number; totalPositions: number }> = {};
      // Fetch all agents in parallel
      await Promise.all(
        agentIds.map(async (id) => {
          try {
            const r = await pnlApi.agentSummary(id);
            results[id] = { unrealizedPnl: r.unrealizedPnl || 0, totalPositions: r.totalPositions || 0 };
          } catch { results[id] = { unrealizedPnl: 0, totalPositions: 0 }; }
        })
      );
      return results;
    },
    enabled: agentIds.length > 0,
    refetchInterval: 10_000,     // Real-time: every 10 seconds
    staleTime: 5_000,            // Fresh for 5 seconds
  });
}

/**
 * Hook for a single agent's unrealized PnL (agent detail page).
 * Uses same queryKey parent so it shares cache with usePortfolioPnl.
 */
export function useAgentPnl(agentId: string) {
  return useQuery({
    queryKey: ["pnl-summary", agentId],
    queryFn: async () => {
      try {
        return await pnlApi.agentSummary(agentId);
      } catch {
        return { unrealizedPnl: 0, totalPositions: 0, positions: [] };
      }
    },
    enabled: !!agentId,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

import { useQuery } from "@tanstack/react-query";
import { positionsApi } from "@/lib/api";

export function usePositions(agentId?: string) {
  const query = useQuery({
    queryKey: ["positions", agentId],
    queryFn: () => positionsApi.list(agentId ? { agentId, status: "open" } : { status: "open" }),
    refetchInterval: 10_000,
  });

  return {
    positions: query.data?.positions ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

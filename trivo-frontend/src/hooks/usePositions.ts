import { useQuery } from "@tanstack/react-query";
import { positionsApi } from "@/lib/api";

export function usePositions(agentId?: string) {
  return useQuery({
    queryKey: ["positions", agentId],
    queryFn: () => positionsApi.list(agentId ? { agentId, status: "open" } : { status: "open" }),
    enabled: true,
    refetchInterval: 30_000,
  });
}

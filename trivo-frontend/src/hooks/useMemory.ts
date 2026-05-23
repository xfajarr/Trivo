import { useQuery } from "@tanstack/react-query";
import { memoryApi } from "@/lib/api";

export function useAgentMemory(agentId: string) {
  return useQuery({
    queryKey: ["agent-memory", agentId],
    queryFn: () => memoryApi.getAgentMemory(agentId),
    enabled: !!agentId,
  });
}

export function useThinkingTraces(agentId: string) {
  return useQuery({
    queryKey: ["thinking-traces", agentId],
    queryFn: () => memoryApi.traces(agentId),
    enabled: !!agentId,
    refetchInterval: 10_000,
  });
}

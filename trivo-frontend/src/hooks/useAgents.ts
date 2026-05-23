import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agentsApi } from "@/lib/api";

export function useAgents() {
  const query = useQuery({
    queryKey: ["agents"],
    queryFn: agentsApi.list,
    refetchInterval: 30_000,
  });

  return {
    agents: query.data?.agents ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: ["agent", id],
    queryFn: () => agentsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: agentsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agents"] }),
  });
}

export function useUpdateAgentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      agentsApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agents"] }),
  });
}

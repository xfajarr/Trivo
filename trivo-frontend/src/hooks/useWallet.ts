import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { walletsApi } from "@/lib/api";

export function useWallet(agentId: string | null) {
  const query = useQuery({
    queryKey: ["wallet", agentId],
    queryFn: () => walletsApi.balance(agentId!),
    enabled: !!agentId,
    refetchInterval: 30_000,
  });

  const qc = useQueryClient();
  const createWallet = useMutation({
    mutationFn: () => walletsApi.create(agentId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wallet", agentId] }),
  });

  return {
    balance: query.data?.balance ?? "0",
    walletAddress: query.data?.walletAddress ?? null,
    isLoading: query.isLoading,
    createWallet: createWallet.mutate,
    refetch: query.refetch,
  };
}

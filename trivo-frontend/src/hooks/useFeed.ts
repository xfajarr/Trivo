import { useQuery, useQueryClient } from "@tanstack/react-query";
import { feedApi } from "@/lib/api";
import { useMemo, useState, useCallback, useEffect } from "react";

export function useFeed() {
  const [filter, setFilter] = useState<string | null>(null);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["feed", filter],
    queryFn: () => feedApi.list(filter ? { venue: filter } : undefined),
    refetchInterval: 5_000, // 🔄 Poll every 5 seconds
    staleTime: 2000, // Data considered fresh for 2s
  });

  // Force refetch on filter change
  useEffect(() => {
    qc.invalidateQueries({ queryKey: ["feed"] });
  }, [filter, qc]);

  return {
    events: query.data?.feed ?? [],
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    filter,
    setFilter,
    refetch: query.refetch,
  };
}

import { useQuery } from "@tanstack/react-query";
import { feedApi } from "@/lib/api";
import { useMemo, useState } from "react";

export function useFeed() {
  const [filter, setFilter] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["feed", filter],
    queryFn: () => feedApi.list(filter ? { venue: filter } : undefined),
    refetchInterval: 15_000,
  });

  return {
    events: query.data?.feed ?? [],
    isLoading: query.isLoading,
    filter,
    setFilter,
    refetch: query.refetch,
  };
}

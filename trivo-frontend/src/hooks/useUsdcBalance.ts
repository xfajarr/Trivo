import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWallets } from "@privy-io/react-auth";

async function fetchBalance(address: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/wallets/usdc/${address}`);
    if (!res.ok) {
      console.warn("[usdc] API status", res.status);
      return null;
    }
    const json = await res.json();
    return json.balance ?? null;
  } catch (err) {
    console.warn("[usdc] fetch failed", err);
    return null;
  }
}

export function useUsdcBalance() {
  const { isAuthenticated } = useAuth();
  const { wallets } = useWallets();
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetch() {
      if (!isAuthenticated || wallets.length === 0) {
        setBalance(null);
        return;
      }
      const wallet = wallets[0];
      if (!wallet?.address) return;

      setIsLoading(true);
      const result = await fetchBalance(wallet.address);
      if (!mounted) return;
      console.log("[usdc] balance for", wallet.address.slice(0, 10) + "…", "=", result);
      setBalance(result);
      setIsLoading(false);
    }

    // Immediate first fetch
    fetch();
    // Then every 5 seconds
    const interval = setInterval(fetch, 5_000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated, wallets]);

  return { balance, isLoading };
}

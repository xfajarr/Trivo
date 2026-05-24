import { useUsdcBalance } from "@/hooks/useUsdcBalance";
import { useAuth } from "@/hooks/useAuth";

export function UsdcBalance() {
  const { isAuthenticated } = useAuth();
  const { balance, isLoading } = useUsdcBalance();

  if (!isAuthenticated) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface/50 px-3 py-1.5">
      <img
        src="/images/Usdc--Streamline-Cryptocurrency.svg"
        alt="USDC"
        className="h-4 w-4 shrink-0"
      />
      <span className="ticker text-xs text-foreground font-medium min-w-[4ch]">
        {isLoading && !balance ? "—" : `${balance ?? "0.00"}`}
      </span>
    </div>
  );
}

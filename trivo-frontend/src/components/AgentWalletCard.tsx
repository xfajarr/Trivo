import { useState } from "react";
import { Copy, Check, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWallets } from "@privy-io/react-auth";
import { usePlatformSend } from "@/hooks/useTransfer";
import { useWallet } from "@/hooks/useWallet";

interface Props {
  agentId: string;
  agentName: string;
  walletAddress?: string;
}

export function AgentWalletCard({ agentId, agentName, walletAddress }: Props) {
  const { wallets } = useWallets();
  const platformSend = usePlatformSend();
  const { balance, isLoading: balanceLoading, refetch } = useWallet(agentId);
  const [amount, setAmount] = useState("");
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!walletAddress) return null;

  const isConnected = wallets.length > 0 && !!wallets[0]?.address;
  const isLoading = platformSend.isPending;

  function copyAddress() {
    navigator.clipboard.writeText(walletAddress!);
    setCopied(true);
    toast.success("Address copied");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleTransfer() {
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!isConnected) {
      toast.error("Connect your wallet first");
      return;
    }
    platformSend.mutate(
      { to: walletAddress!, amount },
      {
        onSuccess: () => {
          setAmount("");
          refetch();
          toast.success(`${amount} USDC sent to ${agentName}`);
        },
        onError: (err) => {
          toast.error("Transfer failed", { description: String(err) });
        },
      },
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface-2/50 p-3 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="ticker text-[10px] uppercase tracking-widest text-muted-foreground">
            Wallet
          </span>
          {/* Balance */}
          {balanceLoading ? (
            <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
          ) : (
            <span className="font-mono text-[11px] text-neon font-semibold">
              ${Number(balance || 0).toFixed(2)} USDC
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={copyAddress}
            title="Copy address"
          >
            {copied ? <Check className="h-3 w-3 text-neon" /> : <Copy className="h-3 w-3" />}
          </Button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] text-neon hover:underline ticker"
          >
            {expanded ? "Close" : "Fund"}
          </button>
        </div>
      </div>

      {/* Address */}
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[10px] text-muted-foreground">
          {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}
        </span>
        <a
          href={`https://testnet.arcscan.app/address/${walletAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] text-muted-foreground/50 hover:text-neon transition-colors"
        >
          ↗
        </a>
      </div>

      {/* Fund panel */}
      {expanded && (
        <div className="space-y-2 pt-2 border-t border-border/50">
          <div className="flex gap-1.5">
            {[10, 50, 100, 500].map((n) => (
              <button
                key={n}
                onClick={() => setAmount(String(n))}
                className={`flex-1 text-[10px] py-1 rounded border ticker ${amount === String(n) ? "border-neon bg-neon/10 text-neon" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                ${n}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Custom"
                className="pr-10 text-xs h-8"
                min={1}
                disabled={isLoading}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                USDC
              </span>
            </div>
            <Button
              size="sm"
              onClick={handleTransfer}
              disabled={isLoading || !amount || Number(amount) <= 0}
              className="h-8 bg-neon text-primary-foreground hover:bg-neon/90 text-xs min-w-[36px]"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ArrowRight className="h-3 w-3" />
              )}
            </Button>
          </div>
          {!isConnected && (
            <p className="text-[9px] text-amber-400">Connect wallet to fund this agent.</p>
          )}
          {isConnected && (
            <p className="text-[9px] text-muted-foreground">
              Send USDC from your wallet on Arc Testnet. {agentName} will trade with these funds.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

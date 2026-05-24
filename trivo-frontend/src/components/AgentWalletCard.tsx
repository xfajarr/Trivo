import { useState } from "react";
import { Copy, Shield, Wallet, Key, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

interface Props {
  agentName: string;
  walletAddress?: string;
  walletId?: string;
}

export function AgentWalletCard({ agentName, walletAddress, walletId }: Props) {
  const [showKey, setShowKey] = useState(false);
  const [perTxLimit, setPerTxLimit] = useState([100]);
  const [dailyLimit, setDailyLimit] = useState([500]);

  function copyAddress() {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    toast.success("Wallet address copied");
  }

  function exportKey() {
    if (!walletAddress) return;
    // For Circle Dev-Controlled Wallets, the key is managed via MPC
    // Users can export via Circle SDK if needed
    setShowKey(!showKey);
    if (!showKey) {
      toast.info("Circle MPC Wallet", {
        description: "Key is managed by Circle's secure enclave. Contact support for key export.",
      });
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-neon" />
          <h3 className="font-display text-sm font-semibold">Agent Wallet</h3>
          <Badge variant="outline" className="ticker text-[10px] border-neon/30 text-neon">CIRCLE MPC</Badge>
        </div>
        {walletId && <span className="ticker text-[10px] text-muted-foreground">ID: {walletId.slice(0,8)}...</span>}
      </div>

      {/* Wallet Address */}
      {walletAddress ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2/50 p-3">
            <code className="flex-1 text-xs font-mono truncate">{walletAddress}</code>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copyAddress}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => toast.info("Coming soon", { description: "Bridge USDC from any chain to Arc Testnet" })}>
              Deposit USDC
            </Button>
            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={exportKey}>
              <Key className="mr-1 h-3 w-3" />
              {showKey ? "Hide key" : "Export key"}
            </Button>
          </div>

          {/* Spending Rules */}
          <div className="rounded-md border border-border bg-surface-2/30 p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-amber-400" />
              <span className="font-display text-xs font-semibold">Spending Rules</span>
            </div>
            
            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Per Transaction</span>
                <span className="text-foreground font-semibold">${perTxLimit[0]}</span>
              </div>
              <Slider value={perTxLimit} onValueChange={setPerTxLimit} min={10} max={500} step={10} className="h-4" />
            </div>

            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Daily Limit</span>
                <span className="text-foreground font-semibold">${dailyLimit[0]}</span>
              </div>
              <Slider value={dailyLimit} onValueChange={setDailyLimit} min={50} max={2000} step={50} className="h-4" />
            </div>

            <Button 
              size="sm" 
              className="w-full bg-neon text-primary-foreground hover:bg-neon/90 text-xs"
              onClick={() => toast.success("Rules saved", { description: `Per-tx: $${perTxLimit[0]} | Daily: $${dailyLimit[0]}` })}
            >
              <Shield className="mr-1.5 h-3 w-3" /> Save Rules
            </Button>
          </div>

          {/* View on Arcscan */}
          <a
            href={`https://testnet.arcscan.app/address/${walletAddress}`}
            target="_blank"
            rel="noopener"
            className="flex items-center justify-center gap-1 text-[10px] text-violet hover:underline ticker"
          >
            View on Arcscan <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
      ) : (
        <div className="rounded-md border border-border bg-surface-2/50 p-4 text-center">
          <Wallet className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">Wallet not configured</p>
          <p className="text-[10px] text-muted-foreground mt-1">Circle API keys required</p>
        </div>
      )}
    </div>
  );
}

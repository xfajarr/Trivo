import { useState } from "react";
import { X, ArrowRight, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  open: boolean;
  onClose: () => void;
  agentName: string;
  walletAddress: string;
}

export function TransferModal({ open, onClose, agentName, walletAddress }: Props) {
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"deposit" | "confirm">("deposit");
  const [copied, setCopied] = useState(false);
  if (!open) return null;

  const truncatedAddr = `${walletAddress.slice(0, 10)}...${walletAddress.slice(-6)}`;

  function copyAddress() {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    toast.success("Address copied");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleTransfer() {
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    // Simulate transfer — in production: call Circle SDK
    toast.success(`$${amount} USDC transferred to ${agentName}`, {
      description: `Tx: 0x${Date.now().toString(16).slice(0, 16)}...`,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-bold">Fund {agentName}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Transfer USDC to your agent's wallet</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-surface-2">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Wallet Address */}
          <div>
            <div className="ticker text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Agent Wallet</div>
            <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2/50 p-3">
              <code className="flex-1 text-xs font-mono truncate">{walletAddress}</code>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copyAddress}>
                {copied ? <Check className="h-3.5 w-3.5 text-neon" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          {/* Quick deposit info */}
          <div className="rounded-md border border-border bg-surface-2/30 p-3">
            <p className="text-xs text-muted-foreground">
              Send USDC to the address above from any wallet. The agent will use this balance for trading on Arc Testnet.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded bg-surface-2 p-2 text-center">
                <div className="text-muted-foreground">Network</div>
                <div className="font-semibold text-neon">Arc Testnet</div>
              </div>
              <div className="rounded bg-surface-2 p-2 text-center">
                <div className="text-muted-foreground">Gas Token</div>
                <div className="font-semibold">USDC</div>
              </div>
            </div>
          </div>

          {/* Quick transfer */}
          <div className="border-t border-border pt-4">
            <div className="ticker text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Quick Transfer (Testnet)</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Amount in USDC"
                  className="pr-12 text-sm"
                  min={1}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">USDC</span>
              </div>
              <Button onClick={handleTransfer} className="bg-neon text-primary-foreground hover:bg-neon/90">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2 mt-2">
              {[10, 50, 100, 500].map(n => (
                <button key={n} onClick={() => setAmount(String(n))} className={`text-[10px] px-2 py-1 rounded border ticker transition-colors ${amount === String(n) ? "border-neon bg-neon/10 text-neon" : "border-border text-muted-foreground hover:text-foreground"}`}>
                  ${n}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

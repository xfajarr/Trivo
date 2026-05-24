import { useState } from "react";
import { Copy, Check, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props { agentName: string; walletAddress?: string }

export function AgentWalletCard({ agentName, walletAddress }: Props) {
  const [amount, setAmount] = useState("");
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  if (!walletAddress) return null;

  function copyAddress() {
    navigator.clipboard.writeText(walletAddress!);
    setCopied(true); toast.success("Address copied");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleTransfer() {
    if (!amount || Number(amount) <= 0) { toast.error("Enter a valid amount"); return; }
    toast.success(`$${amount} USDC transferred`, { description: `To: ${walletAddress!.slice(0,10)}...` });
    setAmount("");
  }

  return (
    <div className="rounded-lg border border-border bg-surface-2/50 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="ticker text-[10px] uppercase tracking-widest text-muted-foreground">Wallet</span>
          <span className="font-mono text-[11px] text-foreground">{walletAddress.slice(0,8)}...{walletAddress.slice(-6)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyAddress}>
            {copied ? <Check className="h-3 w-3 text-neon" /> : <Copy className="h-3 w-3" />}
          </Button>
          <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-neon hover:underline ticker">{expanded ? "Close" : "Fund"}</button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-2 pt-2 border-t border-border/50">
          <div className="flex gap-1.5">
            {[10, 50, 100].map(n => (
              <button key={n} onClick={() => setAmount(String(n))} className={`flex-1 text-[10px] py-1 rounded border ticker ${amount === String(n) ? "border-neon bg-neon/10 text-neon" : "border-border text-muted-foreground hover:text-foreground"}`}>${n}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" className="pr-10 text-xs h-8" min={1} />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">USDC</span>
            </div>
            <Button size="sm" onClick={handleTransfer} className="h-8 bg-neon text-primary-foreground hover:bg-neon/90 text-xs"><ArrowRight className="h-3 w-3" /></Button>
          </div>
          <p className="text-[9px] text-muted-foreground">Send USDC on Arc Testnet. {agentName} will use this for trading.</p>
        </div>
      )}
    </div>
  );
}

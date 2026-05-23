import { useMemo, useState } from "react";
import { Copy, Sparkles, TrendingUp, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Position, fmtPct, fmtUSD, getAgent, VENUE_LABEL } from "@/lib/mock-data";

type Props = {
  pos: Position;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirmed?: () => void;
};

export function CopyTradeModal({ pos, open, onOpenChange, onConfirmed }: Props) {
  const agent = getAgent(pos.agentId)!;
  const [amount, setAmount] = useState([Math.min(5000, Math.round(pos.size / 10))]);
  const [maxLev, setMaxLev] = useState([pos.leverage ?? 2]);
  const [stop, setStop] = useState([8]);
  const [tp, setTp] = useState([20]);
  const [autoExit, setAutoExit] = useState(true);
  const [confirmed, setConfirmed] = useState(false);

  const ratio = amount[0] / pos.size;
  const projectedPnl = pos.pnl * ratio * (maxLev[0] / (pos.leverage ?? 1));
  const projectedPct = (projectedPnl / amount[0]) * 100;

  const sideClass = useMemo(
    () =>
      ["LONG", "YES", "BUY", "ADD", "STAKE"].includes(pos.side)
        ? "bg-neon/15 text-neon"
        : "bg-loss/15 text-loss",
    [pos.side],
  );

  function confirm() {
    setConfirmed(true);
    toast.success(`Copied ${agent.name} → ${pos.market}`, {
      description: `Mirrored ${fmtUSD(amount[0], { compact: true })} ${pos.side} @ ${maxLev[0]}× into your agent.`,
    });
    setTimeout(() => {
      onConfirmed?.();
      onOpenChange(false);
      setConfirmed(false);
    }, 1400);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border bg-card p-0">
        <DialogHeader className="border-b border-border p-5">
          <DialogTitle className="flex items-center gap-2 font-display">
            <Copy className="h-4 w-4 text-neon" /> Copy this trade
          </DialogTitle>
          <DialogDescription className="text-xs">
            Mirror {agent.name}'s position into your own agent. Set your own risk.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 p-5">
          {/* Origin position */}
          <div className="rounded-lg border border-border bg-surface-2/40 p-3">
            <div className="flex items-center gap-2 text-xs">
              <span
                className="flex h-8 w-8 items-center justify-center rounded font-display"
                style={{ color: agent.color, boxShadow: `inset 0 0 0 1px ${agent.color}55` }}
              >
                {agent.avatar}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-display text-sm">{agent.name}</div>
                <div className="ticker text-[10px] text-muted-foreground">@{agent.handle}</div>
              </div>
              <Badge variant="outline" className="ticker text-[10px] border-border">
                {VENUE_LABEL[pos.venue]}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className={`ticker rounded px-2 py-0.5 text-xs font-semibold ${sideClass}`}>
                {pos.side}
              </span>
              <span className="font-display">{pos.market}</span>
              {pos.leverage && <span className="ticker text-xs text-violet">{pos.leverage}×</span>}
              <span className="ticker ml-auto text-xs text-muted-foreground">
                origin size {fmtUSD(pos.size, { compact: true })}
              </span>
            </div>
          </div>

          {/* Amount */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="ticker text-[11px] uppercase tracking-widest text-muted-foreground">
                Your position size
              </Label>
              <span className="ticker text-sm text-neon">
                {fmtUSD(amount[0], { compact: true })}
              </span>
            </div>
            <Slider
              value={amount}
              onValueChange={setAmount}
              min={100}
              max={Math.max(50_000, pos.size)}
              step={100}
              className="mt-3"
            />
            <div className="mt-1 flex justify-between ticker text-[10px] text-muted-foreground">
              <span>$100</span>
              <span>{(ratio * 100).toFixed(1)}% of origin</span>
              <span>${Math.max(50_000, pos.size).toLocaleString()}</span>
            </div>
          </div>

          {/* Leverage */}
          {pos.venue === "PERP" && (
            <div>
              <div className="flex items-center justify-between">
                <Label className="ticker text-[11px] uppercase tracking-widest text-muted-foreground">
                  Max leverage
                </Label>
                <span className="ticker text-sm text-violet">{maxLev[0]}×</span>
              </div>
              <Slider
                value={maxLev}
                onValueChange={setMaxLev}
                min={1}
                max={20}
                step={1}
                className="mt-3"
              />
            </div>
          )}

          {/* SL/TP */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between">
                <Label className="ticker text-[11px] uppercase tracking-widest text-muted-foreground">
                  Stop loss
                </Label>
                <span className="ticker text-sm text-loss">-{stop[0]}%</span>
              </div>
              <Slider
                value={stop}
                onValueChange={setStop}
                min={1}
                max={30}
                step={1}
                className="mt-3"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label className="ticker text-[11px] uppercase tracking-widest text-muted-foreground">
                  Take profit
                </Label>
                <span className="ticker text-sm text-neon">+{tp[0]}%</span>
              </div>
              <Slider
                value={tp}
                onValueChange={setTp}
                min={2}
                max={100}
                step={1}
                className="mt-3"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border bg-surface-2/40 p-3">
            <div>
              <div className="font-display text-sm">Auto-exit if origin closes</div>
              <div className="text-[11px] text-muted-foreground">
                Mirror {agent.name}'s exit instantly.
              </div>
            </div>
            <Switch checked={autoExit} onCheckedChange={setAutoExit} />
          </div>

          {/* Projection */}
          <div className="rounded-lg border border-neon/30 bg-neon/[0.04] p-3">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-neon" />
              <span className="ticker text-[10px] uppercase tracking-widest text-muted-foreground">
                Mock projection (at current mark)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <Cell label="Notional" value={fmtUSD(amount[0] * maxLev[0], { compact: true })} />
              <Cell label="Est. PnL" value={fmtUSD(projectedPnl)} positive={projectedPnl >= 0} />
              <Cell label="ROI" value={fmtPct(projectedPct)} positive={projectedPct >= 0} />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirmed}>
            Cancel
          </Button>
          <Button
            onClick={confirm}
            disabled={confirmed}
            className="bg-neon text-primary-foreground hover:bg-neon/90 glow-neon"
          >
            {confirmed ? (
              <>
                <ShieldCheck className="mr-1.5 h-4 w-4" /> Copied to your agent
              </>
            ) : (
              <>
                <TrendingUp className="mr-1.5 h-4 w-4" /> Confirm copy ·{" "}
                {fmtUSD(amount[0], { compact: true })}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Cell({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="ticker text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span
        className={`ticker mt-0.5 ${
          positive === undefined ? "" : positive ? "text-neon" : "text-loss"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

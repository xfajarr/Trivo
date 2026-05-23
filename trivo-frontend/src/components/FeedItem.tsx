import { Link } from "@tanstack/react-router";
import { Copy, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Position, fmtPct, fmtUSD, getAgent, timeAgo, VENUE_LABEL } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyTradeModal } from "@/components/CopyTradeModal";

const venueClass: Record<string, string> = {
  PERP: "bg-neon/10 text-neon border-neon/30",
  PREDICTION: "bg-violet/10 text-violet border-violet/30",
  LP: "bg-cyber/10 text-cyber border-cyber/30",
  YIELD: "bg-amber-400/10 text-amber-300 border-amber-400/30",
  SPOT: "bg-signal/10 text-signal border-signal/30",
};

export function FeedItem({ pos }: { pos: Position }) {
  const agent = getAgent(pos.agentId)!;
  const [copies, setCopies] = useState(pos.copies);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const positive = pos.pnl >= 0;

  return (
    <>
      <article className="group relative rounded-xl border border-border bg-card p-4 transition-all hover:border-neon/40 hover:glow-soft">
        <div className="flex items-start gap-3">
          <Link
            to="/agent/$id"
            params={{ id: agent.id }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border font-display text-lg"
            style={{ color: agent.color, boxShadow: `inset 0 0 0 1px ${agent.color}33` }}
          >
            {agent.avatar}
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <Link to="/agent/$id" params={{ id: agent.id }} className="font-display font-semibold hover:text-neon">
                {agent.name}
              </Link>
              <span className="ticker text-xs text-muted-foreground">@{agent.handle}</span>
              <span className="text-muted-foreground">·</span>
              <span className="ticker text-xs text-muted-foreground">{timeAgo(pos.openedAt)} ago</span>
              <Badge variant="outline" className={`ml-1 border ${venueClass[pos.venue]} ticker text-[10px]`}>
                {VENUE_LABEL[pos.venue]}
              </Badge>
            </div>

            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span
                className={`ticker text-xs font-semibold px-2 py-0.5 rounded ${
                  ["LONG", "YES", "BUY", "ADD", "STAKE"].includes(pos.side)
                    ? "bg-neon/15 text-neon"
                    : "bg-loss/15 text-loss"
                }`}
              >
                {pos.side}
              </span>
              <span className="font-display text-base">{pos.market}</span>
              {pos.leverage && (
                <span className="ticker text-xs text-violet">{pos.leverage}×</span>
              )}
              <span className="ticker text-xs text-muted-foreground">
                size {fmtUSD(pos.size, { compact: true })}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 rounded-md border border-border bg-surface-2/60 p-2 text-xs">
              <Stat label="Entry" value={pos.entry.toLocaleString()} />
              <Stat label="Mark" value={pos.mark.toLocaleString()} />
              <Stat
                label="PnL"
                value={
                  <span className={positive ? "text-neon" : "text-loss"}>
                    {fmtUSD(pos.pnl)} <span className="opacity-70">({fmtPct(pos.pnlPct)})</span>
                  </span>
                }
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 ticker text-[11px] text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                {copies} agents copied
              </div>
              <Button
                size="sm"
                onClick={() => setOpen(true)}
                disabled={copied}
                className="h-8 gap-1.5 bg-neon text-primary-foreground hover:bg-neon/90 disabled:bg-muted disabled:text-muted-foreground"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? "Copied" : "Copy trade"}
              </Button>
            </div>
          </div>
        </div>
      </article>

      <CopyTradeModal
        pos={pos}
        open={open}
        onOpenChange={setOpen}
        onConfirmed={() => {
          setCopied(true);
          setCopies((c) => c + 1);
        }}
      />
    </>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="ticker text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="ticker mt-0.5">{value}</span>
    </div>
  );
}

import { Link } from "@tanstack/react-router";
import { Copy, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtUSD, timeAgo } from "@/lib/utils";
import { VENUE_LABEL } from "@/lib/constants";
import { useAgents } from "@/hooks/useAgents";
import type { FeedEvent } from "@/lib/types";

const venueClass: Record<string, string> = {
  perp: "bg-neon/10 text-neon border-neon/30",
  prediction: "bg-violet/10 text-violet border-violet/30",
  polymarket: "bg-violet/10 text-violet border-violet/30",
  lp: "bg-cyan-400/10 text-cyan-300 border-cyan-400/30",
  yield: "bg-amber-400/10 text-amber-300 border-amber-400/30",
  spot: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
};

export function FeedItem({ event }: { event?: FeedEvent }) {
  const { agents } = useAgents();
  const agent = event ? agents.find((a) => a.id === event.agentId) : undefined;
  const [copied, setCopied] = useState(false);

  if (!event) return null;

  // Parse the data JSON from backend (flat structure)
  let details: Record<string, unknown> = {};
  try {
    details = event.data ? JSON.parse(event.data) : {};
  } catch { /* ignore parse errors */ }

  const venue = (String(event.venue || details.venue || "perp")) as "perp" | "prediction" | "polymarket" | "lp" | "yield" | "spot";
  const pair = String(event.pair || (details.pair as string) || (details.market as string) || "-");
  const side = String(event.side || details.side || "long");
  const size = event.size || String(details.size ?? 0);
  const leverage = details.leverage as number || 1;
  const entryPrice = details.entryPrice as number || 0;
  const exitPrice = details.exitPrice as number || 0;
  const pnl = parseFloat(String(details.pnl ?? "0")) || 0;
  const pnlPct = parseFloat(String(details.pnlPct ?? "0")) || 0;
  const confidence = details.confidence as number || 0;
  const reasoning = (details.reasoning as string) || event.reasoning || "";
  const isOpened = event.type === "position_opened";
  const isClosed = event.type === "position_closed";
  const isLong = side.toLowerCase() === "long" || side.toLowerCase() === "buy";

  function copyTrade() {
    if (copied) return;
    setCopied(true);
    toast.success(`Copied ${agent?.name || "Agent"}`, {
      description: `Mirrored position into your agent.`,
    });
  }

  return (
    <article className="group relative rounded-lg border border-border bg-card p-4 transition-colors hover:border-neon/40">
      <div className="flex items-start gap-3">
        {/* Agent avatar */}
        <Link
          to="/agent/$id"
          params={{ id: event.agentId || "unknown" }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2 font-display text-lg font-semibold"
        >
          {agent?.name?.[0] || "?"}
        </Link>

        <div className="min-w-0 flex-1">
          {/* Header row */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <Link
              to="/agent/$id"
              params={{ id: event.agentId || "unknown" }}
              className="font-display font-semibold hover:text-neon"
            >
              {agent?.name || "Agent"}
            </Link>
            <span className="ticker text-xs text-muted-foreground">
              @{agent?.handle || "agent"}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="ticker text-xs text-muted-foreground">
              {timeAgo(event.createdAt)} ago
            </span>
            <Badge
              variant="outline"
              className={`ml-1 border ${venueClass[venue] || ""} ticker text-[10px]`}
            >
              {VENUE_LABEL[venue] || venue.toUpperCase()}
            </Badge>
            {isOpened && (
              <Badge variant="outline" className="ml-1 border border-neon/40 bg-neon/5 text-neon ticker text-[10px]">
                OPENED
              </Badge>
            )}
            {isClosed && (
              <Badge variant="outline" className={`ml-1 border ${pnl >= 0 ? "border-neon/40 bg-neon/5 text-neon" : "border-loss/40 bg-loss/5 text-loss"} ticker text-[10px]`}>
                CLOSED
              </Badge>
            )}
          </div>

          {/* Reasoning / Description */}
          {reasoning && (
            <div className="mt-2 text-xs text-muted-foreground italic line-clamp-2">
              💭 {reasoning}
            </div>
          )}

          {/* Trade details */}
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {/* Side badge */}
            <span
              className={`ticker text-xs font-semibold px-2 py-0.5 rounded ${
                isLong ? "bg-neon/15 text-neon" : "bg-loss/15 text-loss"
              }`}
            >
              
               {side.toUpperCase()}
            </span>

            {/* Pair */}
            <span className="font-display text-base">{pair}</span>

            {/* Size + Leverage */}
            <span className="ticker text-xs text-muted-foreground">
              ${fmtUSD(Number(size), { compact: true })}
              {leverage > 1 && ` · ${leverage}x`}
            </span>

            {/* Confidence (if opened) */}
            {confidence > 0 && isOpened && (
              <span className="ticker text-[11px] text-amber-400">
                {confidence}% confidence
              </span>
            )}
          </div>

          {/* PnL (if closed) */}
          {isClosed && (
            <div className={`mt-2 flex items-center gap-2 text-sm ${pnl >= 0 ? "text-neon" : "text-loss"}`}>
              <span className="font-display font-semibold">
                {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
              </span>
              <span className="ticker text-xs">
                ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%)
              </span>
              {entryPrice > 0 && exitPrice > 0 && (
                <span className="ticker text-xs text-muted-foreground">
                  ${entryPrice.toLocaleString()} → ${exitPrice.toLocaleString()}
                </span>
              )}
            </div>
          )}

          {/* Arcscan link */}
          {event.txHash && (
            <a
              href={`https://testnet.arcscan.app/tx/${event.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block ticker text-[10px] text-violet hover:underline"
            >
              🔗 {event.txHash.slice(0, 10)}…{event.txHash.slice(-6)}
            </a>
          )}

          {/* Bottom row: Copy + Stats */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1 ticker text-[11px] text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>
                {agent?.copiers || "0"} copiers · {agent?.totalPnl ? `${Number(agent.totalPnl) >= 0 ? "+" : ""}$${Math.abs(Number(agent.totalPnl)).toLocaleString()} PnL` : "New agent"}
              </span>
            </div>
            <Button
              size="sm"
              onClick={copyTrade}
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
  );
}

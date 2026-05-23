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
  lp: "bg-cyan-400/10 text-cyan-300 border-cyan-400/30",
  yield: "bg-amber-400/10 text-amber-300 border-amber-400/30",
  spot: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
};

export function FeedItem({ event }: { event?: FeedEvent }) {
  const { agents } = useAgents();
  const agent = event ? agents.find((a) => a.id === event.agentId) : undefined;
  const [copied, setCopied] = useState(false);

  if (!event) return null;

  let decision: Record<string, unknown> | null = null;
  try {
    decision = event.data ? JSON.parse(event.data) : null;
  } catch {
    // ignore parse errors
  }

  const side = decision?.decision?.args?.side || event?.type || "trade";
  const market = decision?.decision?.args?.market || "-";
  const size = decision?.decision?.args?.size || 0;
  const venue = event?.venue || "perp";

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
        <Link
          to="/agent/$id"
          params={{ id: event.agentId }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border font-display text-lg"
        >
          {agent?.name?.[0] || "?"}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <Link
              to="/agent/$id"
              params={{ id: event.agentId }}
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
              {VENUE_LABEL[venue] || venue}
            </Badge>
          </div>

          {event.reasoning && (
            <div className="mt-2 text-xs text-muted-foreground italic line-clamp-2">
              {event.reasoning}
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span
              className={`ticker text-xs font-semibold px-2 py-0.5 rounded ${
                ["LONG", "YES", "BUY", "ADD", "STAKE"].includes(side)
                  ? "bg-neon/15 text-neon"
                  : "bg-loss/15 text-loss"
              }`}
            >
              {side}
            </span>
            <span className="font-display text-base">{market}</span>
            {size > 0 && (
              <span className="ticker text-xs text-muted-foreground">
                size {fmtUSD(size, { compact: true })}
              </span>
            )}
          </div>

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

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1 ticker text-[11px] text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              Copy
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

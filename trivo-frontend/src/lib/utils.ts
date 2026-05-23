import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useState, useEffect } from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Live-updating relative time (re-renders every second)
export function useTimeAgo(ts: number | string | undefined) {
  const [text, setText] = useState(() => formatTimeAgo(ts));

  useEffect(() => {
    const update = () => setText(formatTimeAgo(ts));
    update();
    const id = setInterval(update, 5000); // Update every 5s
    return () => clearInterval(id);
  }, [ts]);

  return text;
}

function formatTimeAgo(ts: number | string | undefined) {
  if (!ts) return "just now";
  const t = typeof ts === "string" ? new Date(ts).getTime() : ts;
  if (isNaN(t)) return "just now";
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const mi = Math.floor(s / 60);
  if (mi < 60) return `${mi}m ago`;
  const h = Math.floor(mi / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Legacy: non-reactive (for non-component usage)
export function timeAgo(ts: number | string | undefined) {
  return formatTimeAgo(ts);
}

// ── Number formatting ──

export function fmtUSD(
  value: number,
  opts?: { compact?: boolean; decimals?: number }
) {
  const d = opts?.decimals ?? 2;
  if (opts?.compact) {
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  }
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;
}

export function fmtPct(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

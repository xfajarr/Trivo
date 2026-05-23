import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtUSD(n: number, opts: { compact?: boolean } = {}) {
  if (opts.compact && Math.abs(n) >= 1000) {
    return (
      "$" + Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n)
    );
  }
  return "$" + Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(n);
}

export function fmtPct(n: number) {
  const s = n >= 0 ? "+" : "";
  return `${s}${n.toFixed(2)}%`;
}

export function timeAgo(ts: number | string | undefined) {
  if (!ts) return "just now";
  const t = typeof ts === "string" ? new Date(ts).getTime() : ts;
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s`;
  const mi = Math.floor(s / 60);
  if (mi < 60) return `${mi}m`;
  const h = Math.floor(mi / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

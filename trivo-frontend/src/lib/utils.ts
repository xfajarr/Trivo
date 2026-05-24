import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useState, useEffect, useRef } from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Live-updating relative time
export function useTimeAgo(ts: number | string | undefined) {
  const timestamp = useRef<number>(0);
  const [text, setText] = useState("");

  // Parse timestamp once
  useEffect(() => {
    if (!ts) {
      timestamp.current = 0;
      return;
    }
    const t = typeof ts === "string" ? new Date(ts).getTime() : ts;
    timestamp.current = isNaN(t) ? 0 : t;
  }, [ts]);

  // Update display every second
  useEffect(() => {
    const tick = () => {
      if (timestamp.current === 0) {
        setText("just now");
        return;
      }
      const s = Math.max(1, Math.floor((Date.now() - timestamp.current) / 1000));
      if (s < 60) setText(`${s}s ago`);
      else if (s < 3600) setText(`${Math.floor(s / 60)}m ago`);
      else if (s < 86400) setText(`${Math.floor(s / 3600)}h ago`);
      else setText(`${Math.floor(s / 86400)}d ago`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []); // Empty deps = runs forever

  return text || "just now";
}

export function timeAgo(ts: number | string | undefined) {
  if (!ts) return "just now";
  const t = typeof ts === "string" ? new Date(ts).getTime() : ts;
  if (isNaN(t)) return "just now";
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function fmtUSD(value: number, opts?: { compact?: boolean; decimals?: number }) {
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

"use client";

import { cn } from "@/lib/utils";

interface ShineBorderProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  color?: string;
}

export function ShineBorder({
  children,
  className,
  duration = 3,
  color = "#ABFF4F",
}: ShineBorderProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-[inherit]", className)}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(800px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${color}33, transparent 40%)`,
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none shine-border-rotate"
        style={{
          background: `conic-gradient(from 0deg, transparent, ${color}40, transparent)`,
          animationDuration: `${duration}s`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

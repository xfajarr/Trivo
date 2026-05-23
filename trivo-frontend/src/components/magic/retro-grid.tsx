"use client";

import { cn } from "@/lib/utils";

interface RetroGridProps {
  className?: string;
  angle?: number;
  cellSize?: number;
  opacity?: number;
}

export function RetroGrid({
  className,
  angle = 65,
  cellSize = 60,
  opacity = 0.15,
}: RetroGridProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden [perspective:200px]",
        className,
      )}
    >
      <div
        className="absolute inset-0 [transform:rotateX(var(--grid-angle))]"
        style={{ "--grid-angle": `${angle}deg` } as React.CSSProperties}
      >
        <div
          className="retro-grid-animate absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(171,255,79,${opacity}) 1px, transparent 1px), linear-gradient(to bottom, rgba(171,255,79,${opacity}) 1px, transparent 1px)`,
            backgroundSize: `${cellSize}px ${cellSize}px`,
          }}
        />
      </div>
    </div>
  );
}

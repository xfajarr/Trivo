"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedBeamProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  fromRef: React.RefObject<HTMLDivElement | null>;
  toRef: React.RefObject<HTMLDivElement | null>;
  curvature?: number;
  duration?: number;
  startYOffset?: number;
  endYOffset?: number;
  reverse?: boolean;
}

export function AnimatedBeam({
  containerRef,
  fromRef,
  toRef,
  curvature = 0,
  duration = 3,
  startYOffset = 0,
  endYOffset = 0,
  reverse = false,
}: AnimatedBeamProps) {
  const [path, setPath] = useState("");
  const animRef = useRef<number>(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = toRef.current;
    const container = containerRef.current;
    if (!from || !to || !container) return;

    function calculate() {
      const fromRect = from!.getBoundingClientRect();
      const toRect = to!.getBoundingClientRect();
      const containerRect = container!.getBoundingClientRect();

      const startX = fromRect.left + fromRect.width / 2 - containerRect.left;
      const startY = fromRect.top + fromRect.height / 2 - containerRect.top + startYOffset;
      const endX = toRect.left + toRect.width / 2 - containerRect.left;
      const endY = toRect.top + toRect.height / 2 - containerRect.top + endYOffset;

      const controlX = (startX + endX) / 2 + curvature;
      const controlY = (startY + endY) / 2;

      const d = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
      setPath(d);
    }

    calculate();
    const ro = new ResizeObserver(calculate);
    ro.observe(container);
    ro.observe(from);
    ro.observe(to);
    return () => ro.disconnect();
  }, [containerRef, fromRef, toRef, curvature, startYOffset, endYOffset]);

  return (
    <svg className="absolute inset-0 size-full pointer-events-none" style={{ overflow: "visible" }}>
      <path
        d={path}
        fill="none"
        className="beam-path"
        style={{
          stroke: "rgba(171, 255, 79, 0.4)",
          strokeWidth: 1.5,
          filter: "blur(1px)",
        }}
      />
      <path
        d={path}
        fill="none"
        className="beam-head"
        style={{
          stroke: "#ABFF4F",
          strokeWidth: 2,
          strokeDasharray: 8,
          strokeDashoffset: reverse ? 0 : 1000,
          animation: `beam-flow ${duration}s linear infinite ${reverse ? "reverse" : ""}`,
          filter: "drop-shadow(0 0 6px rgba(171, 255, 79, 0.6))",
        }}
      />
    </svg>
  );
}

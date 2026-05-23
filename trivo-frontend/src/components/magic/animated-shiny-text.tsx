"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedShinyTextProps {
  children: React.ReactNode;
  className?: string;
  shimmerWidth?: number;
}

export function AnimatedShinyText({
  children,
  className,
  shimmerWidth = 100,
}: AnimatedShinyTextProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.1 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <span ref={ref} className={cn("relative inline-block overflow-hidden", className)}>
      <span
        className="inline-block"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(171,255,79,0.4), transparent)",
          backgroundSize: "200% 100%",
          backgroundPosition: visible ? "100% 0" : "-100% 0",
          transition: visible ? "background-position 1.2s ease-out" : "none",
          animation: visible ? `shiny-text-sweep 2.5s ease-in-out infinite 1s` : "none",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        {children}
      </span>
    </span>
  );
}

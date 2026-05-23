"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface MorphingTextProps {
  texts: string[];
  className?: string;
  interval?: number;
}

export function MorphingText({ texts, className, interval = 2500 }: MorphingTextProps) {
  const [index, setIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % texts.length);
        setIsAnimating(false);
      }, 300);
    }, interval);
    return () => clearInterval(timer);
  }, [texts.length, interval]);

  return (
    <span className={cn("relative inline-block", className)}>
      <span
        className="inline-block transition-all duration-300"
        style={{
          opacity: isAnimating ? 0 : 1,
          transform: isAnimating ? "translateY(-8px)" : "translateY(0)",
          filter: isAnimating ? "blur(4px)" : "blur(0)",
        }}
      >
        {texts[index]}
      </span>
    </span>
  );
}

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface SparklesTextProps {
  text: string;
  className?: string;
  sparklesCount?: number;
}

function generateSparkles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 3,
    duration: Math.random() * 2 + 2,
    size: Math.random() * 3 + 1,
  }));
}

export function SparklesText({ text, className, sparklesCount = 12 }: SparklesTextProps) {
  const [sparkles] = useState(() => generateSparkles(sparklesCount));

  return (
    <span className={cn("relative inline-block", className)}>
      <span className="relative z-10">{text}</span>
      {sparkles.map((s) => (
        <span
          key={s.id}
          className="absolute inline-block rounded-full bg-neon"
          style={{
            width: s.size,
            height: s.size,
            left: `${s.x}%`,
            top: `${s.y}%`,
            animation: `sparkle ${s.duration}s ${s.delay}s infinite`,
          }}
        />
      ))}
    </span>
  );
}

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface WordRotateProps {
  words: string[];
  className?: string;
  duration?: number;
}

export function WordRotate({ words, className, duration = 2500 }: WordRotateProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % words.length);
    }, duration);
    return () => clearInterval(interval);
  }, [words.length, duration]);

  return (
    <span className={cn("relative inline-flex items-center", className)}>
      {words.map((word, i) => (
        <span
          key={word}
          className={cn(
            "transition-all duration-1000 ease-out",
            i === index
              ? "opacity-100 translate-y-0 scale-100 relative"
              : "opacity-0 translate-y-2 scale-[0.97] pointer-events-none absolute inset-0",
          )}
        >
          {word}
        </span>
      ))}
    </span>
  );
}

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
            "absolute left-0 transition-all duration-500",
            i === index
              ? "opacity-100 translate-y-0 relative"
              : "opacity-0 translate-y-3 pointer-events-none",
          )}
        >
          {word}
        </span>
      ))}
    </span>
  );
}

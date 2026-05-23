import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface MarqueeProps {
  children: React.ReactNode;
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
}

export function Marquee({
  children,
  className,
  reverse = false,
  pauseOnHover = false,
}: MarqueeProps) {
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
    >
      <div
        className={cn("flex gap-8", isPaused ? "" : "marquee")}
        style={{
          animation: reverse
            ? "marquee-reverse 40s linear infinite"
            : "marquee 40s linear infinite",
          width: "max-content",
        }}
      >
        <span className="flex gap-8 pr-8">{children}</span>
        <span className="flex gap-8 pr-8" aria-hidden="true">
          {children}
        </span>
      </div>
    </div>
  );
}

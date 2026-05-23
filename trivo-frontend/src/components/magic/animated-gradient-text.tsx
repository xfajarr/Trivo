import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AnimatedGradientTextProps {
  children: React.ReactNode;
  className?: string;
  from?: string;
  to?: string;
}

export function AnimatedGradientText({
  children,
  className,
  from = "#ABFF4F",
  to = "#19E6D2",
}: AnimatedGradientTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);

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
    <span
      ref={ref}
      className={cn(
        "inline-block bg-clip-text text-transparent",
        visible ? "animate-gradient" : "opacity-0",
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(90deg, ${from}, ${to}, ${from})`,
        backgroundSize: "200% 100%",
      }}
    />
  );
}

import { cn } from "@/lib/utils";

interface AnimatedShinyTextProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedShinyText({ children, className }: AnimatedShinyTextProps) {
  return (
    <span className={cn("relative inline-flex items-center gap-1.5", className)}>
      {/* Base text — always visible, inherits className styling */}
      <span className="relative z-10">{children}</span>
      {/* Shimmer highlight — white sweep with wider spread */}
      <span
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.35) 35%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.35) 65%, transparent 90%)",
          backgroundSize: "200% 100%",
          animation: "shiny-text-sweep 25s ease-in-out infinite",
        }}
      />
    </span>
  );
}

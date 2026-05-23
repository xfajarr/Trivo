import { cn } from "@/lib/utils";

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
}

export function BorderBeam({ className, size = 300, duration = 8 }: BorderBeamProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden",
        className,
      )}
    >
      <div
        className="absolute animate-beam rounded-full opacity-40"
        style={{
          background: "conic-gradient(from 0deg, transparent, var(--neon), transparent 30%)",
          width: size,
          height: size,
          animationDuration: `${duration}s`,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          filter: "blur(2px)",
        }}
      />
    </div>
  );
}

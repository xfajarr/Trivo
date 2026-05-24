import { cn } from "@/lib/utils";

interface ShimmerButtonProps {
  children: React.ReactNode;
  className?: string;
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  onClick?: () => void;
}

export function ShimmerButton({
  children,
  className,
  shimmerColor = "#ffffff",
  shimmerSize = "0.1em",
  borderRadius = "100px",
  shimmerDuration = "2.5s",
  background = "rgba(171, 255, 79, 1)",
  onClick,
}: ShimmerButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative overflow-hidden cursor-pointer font-display font-semibold text-background",
        className,
      )}
      style={{
        background,
        borderRadius,
        boxShadow: "0 0 32px rgba(171, 255, 79, 0.35), 0 0 1px rgba(171, 255, 79, 0.6)",
      }}
    >
      {/* Base shimmer sweep */}
      <span
        className="absolute inset-0"
        style={{
          background: `linear-gradient(105deg, transparent 40%, ${shimmerColor} 50%, transparent 60%)`,
          backgroundSize: "200% 100%",
          animation: `shimmer-sweep ${shimmerDuration} ease-in-out infinite`,
          opacity: 0.6,
        }}
      />
      {/* Perimeter shimmer */}
      <span
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 30% 50%, ${shimmerColor}66 0%, transparent 50%), radial-gradient(circle at 70% 50%, ${shimmerColor}33 0%, transparent 50%)`,
          borderRadius,
          animation: `shimmer-pulse ${shimmerDuration} ease-in-out infinite`,
        }}
      />
      <span className="relative z-10">{children}</span>
    </button>
  );
}

import { cn } from "@/lib/utils";

interface OrbitingCirclesProps {
  className?: string;
  children?: React.ReactNode;
  reverse?: boolean;
  duration?: number;
  delay?: number;
  radius?: number;
}

export function OrbitingCircles({
  className,
  children,
  reverse = false,
  duration = 20,
  delay = 0,
  radius = 100,
}: OrbitingCirclesProps) {
  return (
    <div
      className={cn("absolute flex items-center justify-center", className)}
      style={{
        animation: `orbit ${duration}s linear infinite ${delay}s ${reverse ? "reverse" : ""}`,
      }}
    >
      <div
        className="absolute"
        style={{
          transform: `translateX(${radius}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

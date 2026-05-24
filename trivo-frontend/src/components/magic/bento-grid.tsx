import { cn } from "@/lib/utils";

interface BentoItemProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  colSpan?: 1 | 2 | 3;
  rowSpan?: 1 | 2;
}

export function BentoGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("grid gap-4 md:grid-cols-3", className)}>{children}</div>;
}

export function BentoItem({
  children,
  className,
  style,
  colSpan = 1,
  rowSpan = 1,
}: BentoItemProps) {
  return (
    <div
      style={style}
      className={cn(
        "rounded-xl border border-border bg-card p-6 relative overflow-hidden",
        colSpan === 2 && "md:col-span-2",
        colSpan === 3 && "md:col-span-3",
        rowSpan === 2 && "md:row-span-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

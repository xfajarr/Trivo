import { useEffect, useRef, useState } from "react";
import { motion, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

interface NumberTickerProps {
  value: number;
  className?: string;
  decimalPlaces?: number;
  prefix?: string;
  suffix?: string;
  direction?: "up" | "down";
  delay?: number;
  startValue?: number;
}

export function NumberTicker({
  value,
  className,
  decimalPlaces = 0,
  prefix = "",
  suffix = "",
  direction = "up",
  delay = 0,
  startValue = 0,
}: NumberTickerProps) {
  const spring = useSpring(startValue, { stiffness: 60, damping: 20 });
  const [display, setDisplay] = useState(String(startValue));
  const hasStarted = useRef(false);

  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => {
        hasStarted.current = true;
        spring.set(value);
      }, delay);
      return () => clearTimeout(timer);
    } else {
      hasStarted.current = true;
      spring.set(value);
    }
  }, [value, delay, spring]);

  useEffect(() => {
    const unsubscribe = spring.on("change", (v) => {
      setDisplay(`${prefix}${v.toFixed(decimalPlaces)}${suffix}`);
    });
    return unsubscribe;
  }, [spring, prefix, suffix, decimalPlaces]);

  return (
    <motion.span className={cn("tabular-nums font-mono inline-block", className)}>
      {display}
    </motion.span>
  );
}

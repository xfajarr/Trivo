"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";

interface HyperTextProps {
  text: string;
  className?: string;
  duration?: number;
  delay?: number;
}

export function HyperText({ text, className, duration = 1500, delay = 0 }: HyperTextProps) {
  const [display, setDisplay] = useState(text);
  const [triggered, setTriggered] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setTriggered(true);
      },
      { threshold: 0.1 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!triggered) return;
    const timeout = setTimeout(() => {
      const len = text.length;
      const intervalTime = 30;
      const totalSteps = Math.floor(duration / intervalTime);
      let step = 0;

      const interval = setInterval(() => {
        step++;
        const progress = step / totalSteps;
        let result = "";

        for (let i = 0; i < len; i++) {
          const charProgress = i / len;
          if (progress > charProgress + 0.1) {
            result += text[i];
          } else if (progress > charProgress) {
            result += CHARS[Math.floor(Math.random() * CHARS.length)];
          } else {
            result += CHARS[Math.floor(Math.random() * CHARS.length)];
          }
        }

        setDisplay(result);

        if (step >= totalSteps) {
          clearInterval(interval);
          setDisplay(text);
        }
      }, intervalTime);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timeout);
  }, [triggered, text, duration, delay]);

  return (
    <span ref={ref} className={cn("inline-block font-mono", className)}>
      {display}
    </span>
  );
}

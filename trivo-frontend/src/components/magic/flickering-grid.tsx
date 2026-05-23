import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface FlickeringGridProps {
  className?: string;
  squareSize?: number;
  gridGap?: number;
  flickerChance?: number;
  color?: string;
  width?: number;
  height?: number;
  maxOpacity?: number;
}

export function FlickeringGrid({
  className,
  squareSize = 4,
  gridGap = 6,
  flickerChance = 0.1,
  color = "#6B7280",
  width = 800,
  height = 800,
  maxOpacity = 0.3,
}: FlickeringGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const cellsRef = useRef<{ opacity: number; target: number; flickerTimer: number }[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cols = Math.ceil(width / (squareSize + gridGap));
    const rows = Math.ceil(height / (squareSize + gridGap));

    cellsRef.current = Array.from({ length: cols * rows }, () => ({
      opacity: maxOpacity,
      target: maxOpacity,
      flickerTimer: 0,
    }));

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function draw() {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, width, height);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const idx = row * cols + col;
          const cell = cellsRef.current[idx];
          if (!cell) continue;

          if (Math.random() < flickerChance * 0.05) {
            cell.target = Math.random() * maxOpacity;
            cell.flickerTimer = Math.floor(Math.random() * 30 + 10);
          }

          if (cell.flickerTimer > 0) {
            cell.flickerTimer--;
            if (cell.flickerTimer === 0) {
              cell.target = maxOpacity;
            }
          }

          cell.opacity += (cell.target - cell.opacity) * 0.15;

          const x = col * (squareSize + gridGap);
          const y = row * (squareSize + gridGap);

          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, cell.opacity));
          ctx.fillStyle = color;
          ctx.fillRect(x, y, squareSize, squareSize);
          ctx.restore();
        }
      }

      animFrameRef.current = requestAnimationFrame(draw);
    }

    setReady(true);
    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [squareSize, gridGap, flickerChance, color, width, height, maxOpacity]);

  if (!ready) return null;

  return (
    <canvas ref={canvasRef} width={width} height={height} className={cn("size-full", className)} />
  );
}

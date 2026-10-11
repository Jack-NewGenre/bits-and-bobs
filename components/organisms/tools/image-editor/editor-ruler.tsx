"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";
import { rulerStep } from "@/lib/image/editor/viewport";

interface EditorRulerProps {
  orientation: "horizontal" | "vertical";
  zoom: number;
  /** Screen position of the document's 0, measured from the ruler's start. */
  origin: number;
  className?: string;
}

const MINOR_TICKS = 10;

/**
 * A pixel ruler along one edge of the workspace, in document pixels, that
 * follows the zoom and pan. Drawn on a canvas because it redraws on every
 * pan and a few hundred DOM ticks would not keep up.
 */
export function EditorRuler({
  orientation,
  zoom,
  origin,
  className,
}: EditorRulerProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();
  const horizontal = orientation === "horizontal";

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const draw = () => {
      const ratio = window.devicePixelRatio || 1;
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(ratio, ratio);
      ctx.clearRect(0, 0, width, height);

      // Colours come from the element's own classes, so both themes work.
      const { color, borderColor } = getComputedStyle(canvas);
      const length = horizontal ? width : height;
      const depth = horizontal ? height : width;
      const step = rulerStep(zoom);
      const minor = step / MINOR_TICKS;
      const first = Math.floor(-origin / zoom / minor) * minor;

      ctx.strokeStyle = borderColor;
      ctx.fillStyle = color;
      ctx.font = "9px ui-monospace, monospace";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let value = first; value * zoom + origin <= length; value += minor) {
        const at = Math.round(value * zoom + origin) + 0.5;
        const major = Math.abs(value / step - Math.round(value / step)) < 1e-6;
        const tick = major ? depth : depth * 0.3;
        if (horizontal) {
          ctx.moveTo(at, depth);
          ctx.lineTo(at, depth - tick);
        } else {
          ctx.moveTo(depth, at);
          ctx.lineTo(depth - tick, at);
        }
        if (!major) continue;
        const label = String(Math.round(value));
        if (horizontal) {
          ctx.fillText(label, at + 3, 9);
        } else {
          ctx.save();
          ctx.translate(9, at + 3);
          ctx.rotate(-Math.PI / 2);
          ctx.textAlign = "right";
          ctx.fillText(label, 0, 0);
          ctx.restore();
        }
      }
      ctx.stroke();
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [horizontal, zoom, origin, resolvedTheme]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={cn(
        "bg-card text-muted-foreground border-border block",
        horizontal ? "h-5 w-full border-b" : "h-full w-5 border-r",
        className,
      )}
    />
  );
}

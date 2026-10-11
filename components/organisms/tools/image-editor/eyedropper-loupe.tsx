"use client";

import { useEffect, useRef } from "react";

import type { Loupe } from "@/hooks/use-editor-loupe";
import { LOUPE_CELLS, LOUPE_SIZE, LOUPE_ZOOM } from "@/lib/image/editor/loupe";

/** Draws the magnified pixels, a faint pixel grid and a ring round the one a click picks. */
function drawLoupe(ctx: CanvasRenderingContext2D, { source, from }: Loupe) {
  ctx.clearRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    source,
    from.x,
    from.y,
    LOUPE_CELLS,
    LOUPE_CELLS,
    0,
    0,
    LOUPE_SIZE,
    LOUPE_SIZE,
  );

  ctx.strokeStyle = "rgba(127, 127, 127, 0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < LOUPE_CELLS; i++) {
    const at = i * LOUPE_ZOOM + 0.5;
    ctx.moveTo(at, 0);
    ctx.lineTo(at, LOUPE_SIZE);
    ctx.moveTo(0, at);
    ctx.lineTo(LOUPE_SIZE, at);
  }
  ctx.stroke();

  const centre = ((LOUPE_CELLS - 1) / 2) * LOUPE_ZOOM;
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#000";
  ctx.strokeRect(centre - 1, centre - 1, LOUPE_ZOOM + 2, LOUPE_ZOOM + 2);
  ctx.strokeStyle = "#fff";
  ctx.strokeRect(centre + 1, centre + 1, LOUPE_ZOOM - 2, LOUPE_ZOOM - 2);
}

/** The eyedropper's magnifier, with the colour a click would pick shown underneath. */
export function EyedropperLoupe({ loupe }: { loupe: Loupe | null }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = ref.current;
    const ctx = element?.getContext("2d");
    if (!element || !ctx || !loupe) return;
    const ratio = window.devicePixelRatio || 1;
    element.width = LOUPE_SIZE * ratio;
    element.height = LOUPE_SIZE * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawLoupe(ctx, loupe);
  }, [loupe]);

  if (!loupe) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-10 flex flex-col items-center gap-1.5"
      style={{ left: loupe.left, top: loupe.top, width: LOUPE_SIZE }}
    >
      <canvas
        ref={ref}
        className="bg-checkerboard rounded-full border-2 border-background shadow-lg ring-1 ring-border"
        style={{ width: LOUPE_SIZE, height: LOUPE_SIZE }}
      />
      <div className="flex items-center gap-1.5 rounded-md bg-popover px-2 py-1 font-mono text-xs text-popover-foreground shadow-md ring-1 ring-border">
        <span
          className="bg-checkerboard size-3 rounded-sm ring-1 ring-border"
          style={loupe.colour ? { background: loupe.colour } : undefined}
        />
        {loupe.colour ?? "Transparent"}
      </div>
    </div>
  );
}

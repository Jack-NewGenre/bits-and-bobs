"use client";

import type { KeyboardEvent, PointerEvent } from "react";

import { CornerHandle } from "@/components/atoms/corner-handle";
import { svgPoints, type Cut } from "@/lib/image/lasso";
import { CORNERS, type Bounds, type Corner } from "@/lib/image/square-crop";
import { cn } from "@/lib/utils";

interface CutBoxProps {
  rect: Cut;
  bounds: Bounds;
  /** Shown in the box's corner, matching the piece's place in the results. */
  number: number;
  selected: boolean;
  /** A box being drawn: no handles, nothing to focus. */
  draft?: boolean;
  onPointerDown?: (event: PointerEvent<HTMLElement>, corner?: Corner) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
}

const percent = (value: number, of: number) => `${(value / of) * 100}%`;

/**
 * One cut over the image. A box is grabbed anywhere inside it; a lasso cut only
 * on its outline, so drawing next to it starts a new cut instead.
 */
export function CutBox({
  rect,
  bounds,
  number,
  selected,
  draft = false,
  onPointerDown,
  onKeyDown,
}: CutBoxProps) {
  const lasso = Boolean(rect.path);
  return (
    <div
      role={draft ? undefined : "group"}
      tabIndex={draft ? undefined : 0}
      aria-roledescription={draft ? undefined : "cut area"}
      aria-label={
        draft
          ? undefined
          : `Piece ${number}: ${rect.width} by ${rect.height} pixels at ${rect.x}, ${rect.y}. Drag to move, arrow keys to nudge, Delete to remove.`
      }
      aria-current={selected || undefined}
      onPointerDown={(event) => onPointerDown?.(event)}
      onKeyDown={onKeyDown}
      style={{
        left: percent(rect.x, bounds.width),
        top: percent(rect.y, bounds.height),
        width: percent(rect.width, bounds.width),
        height: percent(rect.height, bounds.height),
      }}
      className={cn(
        "focus-visible:ring-ring/50 absolute outline-none focus-visible:ring-3",
        draft
          ? "border-primary pointer-events-none border-dashed"
          : "cursor-move",
        lasso
          ? "pointer-events-none"
          : cn(
              "border-2",
              selected
                ? "border-primary bg-primary/10"
                : "border-primary/70 bg-primary/5",
            ),
      )}
    >
      {rect.path && (
        <svg
          viewBox={`0 0 ${rect.width} ${rect.height}`}
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible"
        >
          <polygon
            points={svgPoints(rect.path)}
            vectorEffect="non-scaling-stroke"
            className={cn(
              "stroke-primary pointer-events-auto stroke-2",
              selected ? "fill-primary/15" : "fill-primary/5 stroke-primary/70",
            )}
          />
        </svg>
      )}
      {!draft && (
        <span className="bg-primary text-primary-foreground pointer-events-none absolute top-0 left-0 px-1 font-mono text-[10px] leading-4">
          {number}
        </span>
      )}
      {selected &&
        !draft &&
        !lasso &&
        CORNERS.map((corner) => (
          <CornerHandle
            key={corner}
            corner={corner}
            onPointerDown={(event) => onPointerDown?.(event, corner)}
          />
        ))}
    </div>
  );
}

export type { CutBoxProps };

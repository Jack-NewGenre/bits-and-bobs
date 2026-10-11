/**
 * Smart guides: while a layer is dragged, its edges and centre snap to the
 * canvas edges and centre and to the other layers' edges and centres.
 */

import type { Bounds } from "@/lib/image/editor/document";

export interface SnapLines {
  x: number[];
  y: number[];
}

export interface Guide {
  axis: "x" | "y";
  /** Document position of the line. */
  at: number;
}

export interface Snap {
  dx: number;
  dy: number;
  guides: Guide[];
}

/** Screen pixels within which a drag is pulled onto a guide. */
export const SNAP_DISTANCE = 6;

function edges(box: Bounds): SnapLines {
  return {
    x: [box.left, box.left + box.width / 2, box.left + box.width],
    y: [box.top, box.top + box.height / 2, box.top + box.height],
  };
}

/** Every line a layer may snap to: the canvas and each of the other layers. */
export function snapLines(
  doc: { width: number; height: number },
  others: readonly Bounds[],
): SnapLines {
  const all = [
    { left: 0, top: 0, width: doc.width, height: doc.height },
    ...others,
  ].map(edges);
  return {
    x: all.flatMap((lines) => lines.x),
    y: all.flatMap((lines) => lines.y),
  };
}

function nearest(
  own: number[],
  targets: number[],
  threshold: number,
): { shift: number; at: number } | null {
  let best: { shift: number; at: number } | null = null;
  for (const line of own) {
    for (const target of targets) {
      const shift = target - line;
      if (
        Math.abs(shift) <= threshold &&
        (!best || Math.abs(shift) < Math.abs(best.shift))
      ) {
        best = { shift, at: target };
      }
    }
  }
  return best;
}

/** How far to move `box` on each axis to sit on the closest guide, and which guides it lands on. */
export function snapBox(
  box: Bounds,
  lines: SnapLines,
  threshold: number,
): Snap {
  const own = edges(box);
  const x = nearest(own.x, lines.x, threshold);
  const y = nearest(own.y, lines.y, threshold);
  return {
    dx: x?.shift ?? 0,
    dy: y?.shift ?? 0,
    guides: [
      ...(x ? [{ axis: "x" as const, at: x.at }] : []),
      ...(y ? [{ axis: "y" as const, at: y.at }] : []),
    ],
  };
}

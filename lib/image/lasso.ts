/** Freehand lasso cuts: an outline drawn with the pointer, kept relative to its bounding box. */

import { isUsableRect, type Point, type Rect } from "@/lib/image/cut-rect";
import type { Bounds } from "@/lib/image/square-crop";

/**
 * A piece to cut out: a plain box, or a box with the lasso outline inside it.
 * The outline is relative to the box's top-left, so moving the box moves it too.
 */
export interface Cut extends Rect {
  path?: Point[];
}

/** Points closer than this to the last one, in source pixels, add nothing but weight. */
export const MIN_POINT_GAP = 2;

const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max);

/** Extend the trail with a point, kept inside the image, unless it barely moved. */
export function addLassoPoint(
  trail: Point[],
  point: Point,
  bounds: Bounds,
): Point[] {
  const next = {
    x: clamp(point.x, bounds.width),
    y: clamp(point.y, bounds.height),
  };
  const last = trail.at(-1);
  if (last && Math.hypot(next.x - last.x, next.y - last.y) < MIN_POINT_GAP)
    return trail;
  return [...trail, next];
}

/** Close a drawn trail into a cut, or `null` when it is too small to be a real one. */
export function cutFromLasso(trail: Point[]): Cut | null {
  if (trail.length < 3) return null;
  const xs = trail.map((point) => point.x);
  const ys = trail.map((point) => point.y);
  const x = Math.floor(Math.min(...xs));
  const y = Math.floor(Math.min(...ys));
  const rect = {
    x,
    y,
    width: Math.ceil(Math.max(...xs)) - x,
    height: Math.ceil(Math.max(...ys)) - y,
  };
  if (!isUsableRect(rect)) return null;
  return {
    ...rect,
    path: trail.map((point) => ({ x: point.x - x, y: point.y - y })),
  };
}

/** The outline as an SVG `points` attribute. */
export function svgPoints(path: Point[]): string {
  return path.map(({ x, y }) => `${x},${y}`).join(" ");
}

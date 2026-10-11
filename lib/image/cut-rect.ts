/** Free-form rectangles cut out of an image: drawn, moved and resized within its bounds. */

import type { Bounds, Corner } from "@/lib/image/square-crop";

export interface Point {
  x: number;
  y: number;
}

export interface Rect extends Point {
  width: number;
  height: number;
}

/** Smallest box worth keeping, in source pixels, so a stray click is not a cut. */
export const MIN_CUT_SIDE = 4;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/** The box between two dragged corners, in either direction, kept inside the image. */
export function rectFromPoints(a: Point, b: Point, bounds: Bounds): Rect {
  const left = Math.round(clamp(Math.min(a.x, b.x), 0, bounds.width));
  const top = Math.round(clamp(Math.min(a.y, b.y), 0, bounds.height));
  const right = Math.round(clamp(Math.max(a.x, b.x), 0, bounds.width));
  const bottom = Math.round(clamp(Math.max(a.y, b.y), 0, bounds.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** Big enough on both sides to be a real cut rather than a slip of the mouse. */
export function isUsableRect({ width, height }: Rect): boolean {
  return width >= MIN_CUT_SIDE && height >= MIN_CUT_SIDE;
}

/** Slide the box by a delta, stopping at the image's edges. */
export function moveRect(
  rect: Rect,
  dx: number,
  dy: number,
  bounds: Bounds,
): Rect {
  return {
    ...rect,
    x: Math.round(clamp(rect.x + dx, 0, bounds.width - rect.width)),
    y: Math.round(clamp(rect.y + dy, 0, bounds.height - rect.height)),
  };
}

/**
 * Drag one corner while the opposite corner stays put. Unlike the square
 * crop the box can take any shape, but it never flips or shrinks below
 * `MIN_CUT_SIDE`.
 */
export function resizeRect(
  rect: Rect,
  corner: Corner,
  dx: number,
  dy: number,
  bounds: Bounds,
): Rect {
  const east = corner.endsWith("e");
  const south = corner.startsWith("s");
  const anchor = {
    x: east ? rect.x : rect.x + rect.width,
    y: south ? rect.y : rect.y + rect.height,
  };
  const movingX = (east ? rect.x + rect.width : rect.x) + dx;
  const movingY = (south ? rect.y + rect.height : rect.y) + dy;

  const moving = {
    x: east
      ? clamp(
          movingX,
          Math.min(anchor.x + MIN_CUT_SIDE, bounds.width),
          bounds.width,
        )
      : clamp(movingX, 0, Math.max(anchor.x - MIN_CUT_SIDE, 0)),
    y: south
      ? clamp(
          movingY,
          Math.min(anchor.y + MIN_CUT_SIDE, bounds.height),
          bounds.height,
        )
      : clamp(movingY, 0, Math.max(anchor.y - MIN_CUT_SIDE, 0)),
  };
  return rectFromPoints(anchor, moving, bounds);
}

/** Map a box found on a downscaled copy back onto the full image, with a margin. */
export function scaleRect(
  rect: Rect,
  factor: number,
  margin: number,
  bounds: Bounds,
): Rect {
  return rectFromPoints(
    {
      x: Math.floor(rect.x * factor) - margin,
      y: Math.floor(rect.y * factor) - margin,
    },
    {
      x: Math.ceil((rect.x + rect.width) * factor) + margin,
      y: Math.ceil((rect.y + rect.height) * factor) + margin,
    },
    bounds,
  );
}

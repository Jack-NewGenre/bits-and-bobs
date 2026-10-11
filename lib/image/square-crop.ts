/** A square region of an image, moved and resized within the image's bounds. */

export interface SquareCrop {
  /** Left edge, in source pixels. */
  x: number;
  /** Top edge, in source pixels. */
  y: number;
  /** Width and height, in source pixels. */
  side: number;
}

export interface Bounds {
  width: number;
  height: number;
}

export type Corner = "nw" | "ne" | "sw" | "se";

export const CORNERS: readonly Corner[] = ["nw", "ne", "sw", "se"];

/** Smallest crop, so a handle can never shrink the box to nothing. */
const MIN_SIDE = 16;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/** The largest centred square inside the image. */
export function centreSquare({ width, height }: Bounds): SquareCrop {
  const side = Math.min(width, height);
  return { x: (width - side) / 2, y: (height - side) / 2, side };
}

/** Slide the crop by a delta, stopping at the image's edges. */
export function moveCrop(
  crop: SquareCrop,
  dx: number,
  dy: number,
  bounds: Bounds,
): SquareCrop {
  return {
    ...crop,
    x: clamp(crop.x + dx, 0, bounds.width - crop.side),
    y: clamp(crop.y + dy, 0, bounds.height - crop.side),
  };
}

/**
 * Drag one corner while the opposite corner stays put. The box stays square,
 * so the drag is projected onto the corner's diagonal, then capped by the
 * room left between the fixed corner and the image's edges.
 */
export function resizeCrop(
  crop: SquareCrop,
  corner: Corner,
  dx: number,
  dy: number,
  bounds: Bounds,
): SquareCrop {
  const east = corner.endsWith("e");
  const south = corner.startsWith("s");
  const anchorX = east ? crop.x : crop.x + crop.side;
  const anchorY = south ? crop.y : crop.y + crop.side;

  const room = Math.min(
    east ? bounds.width - anchorX : anchorX,
    south ? bounds.height - anchorY : anchorY,
  );
  const grow = ((east ? dx : -dx) + (south ? dy : -dy)) / 2;
  const side = clamp(crop.side + grow, Math.min(MIN_SIDE, room), room);

  return {
    x: east ? anchorX : anchorX - side,
    y: south ? anchorY : anchorY - side,
    side,
  };
}

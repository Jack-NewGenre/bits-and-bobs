import type { Point2D } from "@/lib/image/editor/shapes";

/**
 * Where the clone stamp copies from. `offset` is how far each painted pixel
 * sits from the one it copies, fixed when a stroke starts.
 */
export interface CloneSource {
  source: Point2D | null;
  offset: Point2D | null;
}

export const NO_CLONE_SOURCE: CloneSource = { source: null, offset: null };

/**
 * The offset for a stroke starting at `start`. An aligned stamp keeps the
 * first stroke's offset; otherwise every stroke starts again at the source.
 */
export function cloneOffset(
  start: Point2D,
  { source, offset }: CloneSource,
  aligned: boolean,
): Point2D | null {
  if (!source) return null;
  if (aligned && offset) return offset;
  return { x: start.x - source.x, y: start.y - source.y };
}

/**
 * The scene point being copied from, for the crosshair. It follows the
 * pointer once an offset applies, and otherwise sits on the source.
 */
export function cloneMarker(
  pointer: Point2D,
  { source, offset }: CloneSource,
  follow: boolean,
): Point2D | null {
  if (!source) return null;
  if (!follow || !offset) return source;
  return { x: pointer.x - offset.x, y: pointer.y - offset.y };
}

/** The eyedropper's magnifier: which pixels it shows, where it sits, what it reads. */

import { rgbToHex } from "@/lib/image/editor/pixels";
import type { Point2D } from "@/lib/image/editor/shapes";

interface Size {
  width: number;
  height: number;
}

/** Pixels across the loupe. Odd, so one pixel sits exactly in the middle. */
export const LOUPE_CELLS = 11;
/** Screen pixels per document pixel. */
export const LOUPE_ZOOM = 10;
export const LOUPE_SIZE = LOUPE_CELLS * LOUPE_ZOOM;
/** The loupe plus the colour label under it. */
export const LOUPE_BOX: Size = { width: LOUPE_SIZE, height: LOUPE_SIZE + 32 };

const GAP = 20;

/** The top-left of the square of document pixels shown, centred on the one under the pointer. */
export function loupeSource(at: Point2D): Point2D {
  const half = (LOUPE_CELLS - 1) / 2;
  return { x: Math.floor(at.x) - half, y: Math.floor(at.y) - half };
}

/** Below and right of the pointer, flipped to the other side when it would run off the host. */
export function loupePlacement(
  pointer: Point2D,
  host: Size,
  box: Size = LOUPE_BOX,
) {
  const place = (at: number, size: number, room: number) =>
    at + GAP + size > room ? Math.max(0, at - GAP - size) : at + GAP;
  return {
    left: place(pointer.x, box.width, host.width),
    top: place(pointer.y, box.height, host.height),
  };
}

/** The colour of the document pixel at a point, or null off the document or where it is clear. */
export function pixelColour(
  pixels: Pick<CanvasRenderingContext2D, "getImageData">,
  doc: Size,
  at: Point2D,
): string | null {
  const x = Math.floor(at.x);
  const y = Math.floor(at.y);
  if (x < 0 || y < 0 || x >= doc.width || y >= doc.height) return null;
  const [r, g, b, a] = pixels.getImageData(x, y, 1, 1).data;
  return a > 0 ? rgbToHex(r, g, b) : null;
}

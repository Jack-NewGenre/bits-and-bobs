/**
 * Trim the transparent margin from an image, on a canvas, in the browser.
 *
 * A cutout almost always sits inside a much larger rectangle of nothing,
 * the original photo's dimensions, with the subject somewhere in the middle.
 * Trimming to the subject's own bounding box makes the file smaller and, more
 * usefully, makes it drop into a layout without an invisible margin pushing
 * everything around.
 */

import {
  canvasToBlob,
  createCanvas2D,
  nextTick,
  throwIfAborted,
} from "@/lib/image/canvas";
import { clamp } from "@/lib/utils";
import { percentSmaller } from "@/lib/utils";

export interface TrimSettings {
  /**
   * Alpha at or below this counts as empty, 0–255. Above zero it also clears
   * the near-invisible fringe a soft mask leaves behind.
   */
  threshold: number;
  /** Transparent margin to keep around the subject, in pixels. */
  padding: number;
}

export const DEFAULT_TRIM_SETTINGS: TrimSettings = {
  threshold: 0,
  padding: 0,
};

export const MAX_THRESHOLD = 64;
export const MAX_PADDING = 128;

export interface TrimBounds {
  left: number;
  top: number;
  /** Exclusive. */
  right: number;
  /** Exclusive. */
  bottom: number;
  width: number;
  height: number;
}

/**
 * The smallest box containing every pixel more opaque than `threshold`, or
 * `undefined` when the image is empty and there is nothing to trim to.
 */
export function findContentBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  threshold = 0,
): TrimBounds | undefined {
  const cutoff = clamp(threshold, 0, 255);
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] <= cutoff) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }

  if (right < 0) return undefined;

  return {
    left,
    top,
    right: right + 1,
    bottom: bottom + 1,
    width: right + 1 - left,
    height: bottom + 1 - top,
  };
}

/** Grow a box by `padding`, stopping at the edges of the original image. */
export function padBounds(
  bounds: TrimBounds,
  padding: number,
  width: number,
  height: number,
): TrimBounds {
  const amount = Math.max(0, Math.round(padding));
  const left = Math.max(0, bounds.left - amount);
  const top = Math.max(0, bounds.top - amount);
  const right = Math.min(width, bounds.right + amount);
  const bottom = Math.min(height, bounds.bottom + amount);

  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

export interface TrimResult {
  /** Trimmed PNG. */
  blob: Blob;
  sourceWidth: number;
  sourceHeight: number;
  width: number;
  height: number;
  /** The kept region, in the source image's own pixels. */
  bounds: TrimBounds;
  /** False when the image had no transparent margin to remove. */
  trimmed: boolean;
  /** True when every pixel was transparent, so nothing could be trimmed to. */
  isEmpty: boolean;
}

export interface TrimOptions {
  signal?: AbortSignal;
}

/**
 * Trim an image's transparent margin and return the result as a PNG.
 * Throws `DOMException` (name "AbortError") if aborted.
 */
export async function trimImage(
  source: Blob,
  settings: TrimSettings = DEFAULT_TRIM_SETTINGS,
  { signal }: TrimOptions = {},
): Promise<TrimResult> {
  throwIfAborted(signal);

  const bitmap = await createImageBitmap(source);
  throwIfAborted(signal);

  const sourceWidth = bitmap.width;
  const sourceHeight = bitmap.height;

  const full = createCanvas2D(sourceWidth, sourceHeight);
  full.ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();

  await nextTick();
  throwIfAborted(signal);

  const { data } = full.ctx.getImageData(0, 0, sourceWidth, sourceHeight);
  const found = findContentBounds(data, sourceWidth, sourceHeight, settings.threshold);

  // Nothing opaque anywhere: hand the original back rather than a 0x0 image.
  const whole: TrimBounds = {
    left: 0,
    top: 0,
    right: sourceWidth,
    bottom: sourceHeight,
    width: sourceWidth,
    height: sourceHeight,
  };

  if (!found) {
    return {
      blob: await canvasToBlob(full.canvas, "image/png"),
      sourceWidth,
      sourceHeight,
      width: sourceWidth,
      height: sourceHeight,
      bounds: whole,
      trimmed: false,
      isEmpty: true,
    };
  }

  const bounds = padBounds(found, settings.padding, sourceWidth, sourceHeight);
  const { canvas, ctx } = createCanvas2D(bounds.width, bounds.height);
  ctx.drawImage(
    full.canvas,
    bounds.left,
    bounds.top,
    bounds.width,
    bounds.height,
    0,
    0,
    bounds.width,
    bounds.height,
  );

  return {
    blob: await canvasToBlob(canvas, "image/png"),
    sourceWidth,
    sourceHeight,
    width: bounds.width,
    height: bounds.height,
    bounds,
    trimmed: bounds.width !== sourceWidth || bounds.height !== sourceHeight,
    isEmpty: false,
  };
}

/** Percentage of the original area a crop removed. */
export function areaSaved(result: TrimResult): number {
  return percentSmaller(
    result.sourceWidth * result.sourceHeight,
    result.width * result.height,
    { clampToZero: true },
  );
}

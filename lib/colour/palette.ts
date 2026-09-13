/**
 * Pulling a colour palette out of an image.
 *
 * The image is shrunk to a small thumbnail before anything is counted. A
 * palette drawn from forty thousand pixels is indistinguishable from one
 * drawn from twenty million, and the small version runs instantly, so the
 * swatches keep up with the slider.
 */

import { canvasToBlob, createCanvas2D, throwIfAborted } from "@/lib/image/canvas";
import { collectPixels, quantise, type PaletteEntry } from "@/lib/image/quantise";
import { clamp } from "@/lib/utils";

export const MIN_SWATCHES = 2;
export const MAX_SWATCHES = 16;

export interface PaletteSettings {
  /** How many swatches to pull out. */
  count: number;
}

export const DEFAULT_PALETTE_SETTINGS: PaletteSettings = { count: 6 };

/** Longest edge the image is sampled at. */
export const SAMPLE_DIM = 200;

export interface PaletteResult {
  entries: PaletteEntry[];
  /** A tiny PNG of the palette as bands, for the queue thumbnail. */
  blob: Blob;
}

export interface PaletteOptions {
  signal?: AbortSignal;
}

/** Size to sample at, never enlarging a picture that is already small. */
export function computeSampleSize(
  width: number,
  height: number,
  maxDim = SAMPLE_DIM,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxDim) return { width, height };
  const shrink = maxDim / longest;
  return {
    width: Math.max(1, Math.round(width * shrink)),
    height: Math.max(1, Math.round(height * shrink)),
  };
}

/** Render the palette as proportional vertical bands. */
function drawBands(entries: PaletteEntry[]) {
  const width = 240;
  const height = 60;
  const { canvas, ctx } = createCanvas2D(width, height);

  let x = 0;
  entries.forEach((entry, index) => {
    // The last band takes the remainder, so rounding never leaves a gap.
    const span =
      index === entries.length - 1 ? width - x : Math.round(entry.share * width);
    ctx.fillStyle = `rgb(${entry.colour.r} ${entry.colour.g} ${entry.colour.b})`;
    ctx.fillRect(x, 0, span, height);
    x += span;
  });

  return canvas;
}

/**
 * Extract a palette from an image.
 * Throws `DOMException` (name "AbortError") if aborted.
 */
export async function extractPalette(
  source: Blob,
  settings: PaletteSettings = DEFAULT_PALETTE_SETTINGS,
  { signal }: PaletteOptions = {},
): Promise<PaletteResult> {
  throwIfAborted(signal);

  const bitmap = await createImageBitmap(source);
  throwIfAborted(signal);

  const { width, height } = computeSampleSize(bitmap.width, bitmap.height);
  const { ctx } = createCanvas2D(width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const { data } = ctx.getImageData(0, 0, width, height);
  const entries = quantise(
    collectPixels(data),
    clamp(settings.count, MIN_SWATCHES, MAX_SWATCHES),
  );
  throwIfAborted(signal);

  const blob = await canvasToBlob(drawBands(entries), "image/png");
  return { entries, blob };
}

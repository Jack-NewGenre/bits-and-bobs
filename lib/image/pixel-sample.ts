/**
 * Reading colours out of decoded pixels: a single point, an averaged
 * neighbourhood, and the grid of cells a loupe magnifies.
 */

import type { Rgb } from "@/lib/colour/colour";
import { createCanvas2D } from "@/lib/image/canvas";

export interface PixelSource {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Odd sample sizes, so a square always has a centre pixel. */
export const SAMPLE_SIZES = [1, 3, 5, 9] as const;
export type SampleSize = (typeof SAMPLE_SIZES)[number];

const clampIndex = (value: number, size: number) =>
  Math.min(Math.max(Math.floor(value), 0), size - 1);

/** The colour of one pixel, with its coordinates clamped to the image. */
export function pixelAt(
  { data, width, height }: PixelSource,
  x: number,
  y: number,
): Rgb {
  const offset = (clampIndex(y, height) * width + clampIndex(x, width)) * 4;
  return {
    r: data[offset],
    g: data[offset + 1],
    b: data[offset + 2],
    a: Math.round((data[offset + 3] / 255) * 1000) / 1000,
  };
}

/**
 * The average of a `size` × `size` square centred on (x, y), so noise or
 * JPEG artefacts do not decide the colour. Pixels past the edge are skipped.
 */
export function sampleAverage(
  source: PixelSource,
  x: number,
  y: number,
  size: SampleSize,
): Rgb {
  const half = (size - 1) / 2;
  const [cx, cy] = [Math.floor(x), Math.floor(y)];
  const totals = { r: 0, g: 0, b: 0, a: 0 };
  let count = 0;

  for (let row = cy - half; row <= cy + half; row++) {
    for (let column = cx - half; column <= cx + half; column++) {
      if (
        row < 0 ||
        column < 0 ||
        row >= source.height ||
        column >= source.width
      )
        continue;
      const pixel = pixelAt(source, column, row);
      totals.r += pixel.r;
      totals.g += pixel.g;
      totals.b += pixel.b;
      totals.a += pixel.a;
      count++;
    }
  }

  if (count === 0) return pixelAt(source, x, y);
  return {
    r: Math.round(totals.r / count),
    g: Math.round(totals.g / count),
    b: Math.round(totals.b / count),
    a: Math.round((totals.a / count) * 1000) / 1000,
  };
}

/** The `cells` × `cells` grid around (x, y), row by row, for the loupe. */
export function loupeGrid(
  source: PixelSource,
  x: number,
  y: number,
  cells: number,
): Rgb[] {
  const half = Math.floor(cells / 2);
  const [cx, cy] = [Math.floor(x), Math.floor(y)];
  return Array.from({ length: cells * cells }, (_, index) =>
    pixelAt(
      source,
      cx - half + (index % cells),
      cy - half + Math.floor(index / cells),
    ),
  );
}

/** Decode an image file into raw pixels, keeping a canvas to show it on. */
export async function decodePixels(
  file: File,
): Promise<PixelSource & { bitmap: ImageBitmap }> {
  const bitmap = await createImageBitmap(file);
  const { ctx } = createCanvas2D(bitmap.width, bitmap.height);
  ctx.drawImage(bitmap, 0, 0);
  const { data } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  return { data, width: bitmap.width, height: bitmap.height, bitmap };
}

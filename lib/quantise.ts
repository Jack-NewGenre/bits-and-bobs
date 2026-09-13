/**
 * Median-cut colour quantisation.
 *
 * The idea is simple and old: put every pixel in one box, then repeatedly
 * take the roomiest box, find the colour channel it is most spread along,
 * and cut it in half at the median. Splitting along the widest axis is what
 * makes it fair, so a photo that is mostly sky spends its boxes on the many
 * shades of blue it actually contains rather than on colours nobody used.
 *
 * Two tools want the result: the palette extractor, which shows the boxes as
 * swatches, and the compressor, which redraws the image using only them,
 * because a PNG with sixteen colours in it is far smaller than one with
 * thousands.
 */

import type { Rgb } from "@/lib/colour";
import { clamp } from "@/lib/utils";

export const MIN_COLOURS = 2;
export const MAX_COLOURS = 64;

/** Pixels below this alpha are ignored, as they contribute no visible colour. */
const ALPHA_FLOOR = 8;

export interface PaletteEntry {
  colour: Rgb;
  /** How much of the visible image this box covers, 0–1. */
  share: number;
}

interface Box {
  pixels: number[][];
}

function spread(box: Box, channel: number): number {
  let low = 255;
  let high = 0;
  for (const pixel of box.pixels) {
    if (pixel[channel] < low) low = pixel[channel];
    if (pixel[channel] > high) high = pixel[channel];
  }
  return high - low;
}

/** The channel this box varies along most, the one worth cutting. */
function widestChannel(box: Box): number {
  const spreads = [spread(box, 0), spread(box, 1), spread(box, 2)];
  return spreads.indexOf(Math.max(...spreads));
}

function averageOf(box: Box): Rgb {
  const total = box.pixels.reduce(
    (sum, pixel) => [sum[0] + pixel[0], sum[1] + pixel[1], sum[2] + pixel[2]],
    [0, 0, 0],
  );
  const count = box.pixels.length;
  return {
    r: Math.round(total[0] / count),
    g: Math.round(total[1] / count),
    b: Math.round(total[2] / count),
    a: 1,
  };
}

/** Every visible pixel as an [r, g, b] triple, optionally sampled. */
export function collectPixels(
  data: Uint8ClampedArray,
  step = 1,
): number[][] {
  const pixels: number[][] = [];
  const stride = Math.max(1, Math.round(step)) * 4;

  for (let index = 0; index < data.length; index += stride) {
    if (data[index + 3] < ALPHA_FLOOR) continue;
    pixels.push([data[index], data[index + 1], data[index + 2]]);
  }

  return pixels;
}

/**
 * Reduce the pixels to at most `count` representative colours, each with the
 * share of the image it covers. Ordered by share, so the dominant colour
 * comes first.
 */
export function quantise(pixels: number[][], count: number): PaletteEntry[] {
  const wanted = clamp(Math.round(count), 1, MAX_COLOURS);
  if (pixels.length === 0) return [];

  let boxes: Box[] = [{ pixels }];

  while (boxes.length < wanted) {
    // Only boxes with something left to cut are candidates.
    const splittable = boxes.filter((box) => box.pixels.length > 1);
    if (splittable.length === 0) break;

    const target = splittable.reduce((widest, box) =>
      box.pixels.length > widest.pixels.length ? box : widest,
    );

    const channel = widestChannel(target);
    const sorted = [...target.pixels].sort((a, b) => a[channel] - b[channel]);
    const middle = Math.floor(sorted.length / 2);

    boxes = boxes.flatMap((box) =>
      box === target
        ? [{ pixels: sorted.slice(0, middle) }, { pixels: sorted.slice(middle) }]
        : [box],
    );
  }

  const colours = boxes
    .filter((box) => box.pixels.length > 0)
    .map(averageOf);

  // Box sizes cannot stand in for dominance: median cut splits at the median,
  // so every box holds roughly the same number of pixels by construction.
  // Counting how many pixels each final colour actually claims is the only
  // honest measure of which one dominates the image.
  const counts = new Array<number>(colours.length).fill(0);
  const cache = new Map<number, number>();

  for (const [red, green, blue] of pixels) {
    const key = (red << 16) | (green << 8) | blue;
    let index = cache.get(key);
    if (index === undefined) {
      index = nearestIndexIn(colours, red, green, blue);
      cache.set(key, index);
    }
    counts[index] += 1;
  }

  return colours
    .map((colour, index) => ({ colour, share: counts[index] / pixels.length }))
    .filter((entry) => entry.share > 0)
    .sort((first, second) => second.share - first.share);
}

/** Index of the nearest palette entry, by squared distance in RGB. */
export function nearestIndexIn(
  palette: Rgb[],
  r: number,
  g: number,
  b: number,
): number {
  let best = 0;
  let bestDistance = Infinity;

  palette.forEach((entry, index) => {
    const distance =
      (entry.r - r) ** 2 + (entry.g - g) ** 2 + (entry.b - b) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });

  return best;
}

/** Nearest palette entry to a colour, by squared distance in RGB. */
export function nearestIn(palette: Rgb[], r: number, g: number, b: number): Rgb {
  return palette[nearestIndexIn(palette, r, g, b)];
}

/**
 * Redraw a buffer using only the supplied palette, in place. Alpha is kept,
 * so a cutout stays a cutout.
 */
export function applyPalette(
  data: Uint8ClampedArray,
  palette: Rgb[],
): Uint8ClampedArray {
  if (palette.length === 0) return data;
  const cache = new Map<number, Rgb>();

  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < ALPHA_FLOOR) continue;

    const key = (data[index] << 16) | (data[index + 1] << 8) | data[index + 2];
    let match = cache.get(key);
    if (!match) {
      match = nearestIn(palette, data[index], data[index + 1], data[index + 2]);
      cache.set(key, match);
    }

    data[index] = match.r;
    data[index + 1] = match.g;
    data[index + 2] = match.b;
  }

  return data;
}

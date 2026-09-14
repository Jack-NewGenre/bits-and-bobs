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

import type { Rgb } from "@/lib/colour/colour";
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

/** The channel this box varies along most, the one worth cutting. */
function widestChannel(box: Box): number {
  // All three spreads come out of a single walk: the box is the whole image on
  // the first split, so three separate passes over it is three times the work
  // for the same answer.
  let lowR = 255, highR = 0;
  let lowG = 255, highG = 0;
  let lowB = 255, highB = 0;

  for (const pixel of box.pixels) {
    if (pixel[0] < lowR) lowR = pixel[0];
    if (pixel[0] > highR) highR = pixel[0];
    if (pixel[1] < lowG) lowG = pixel[1];
    if (pixel[1] > highG) highG = pixel[1];
    if (pixel[2] < lowB) lowB = pixel[2];
    if (pixel[2] > highB) highB = pixel[2];
  }

  const spreadR = highR - lowR;
  const spreadG = highG - lowG;
  const spreadB = highB - lowB;
  if (spreadR >= spreadG && spreadR >= spreadB) return 0;
  return spreadG >= spreadB ? 1 : 2;
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

  // An indexed loop rather than `forEach`: this is called once per distinct
  // colour in an image, so a callback per call is a callback per colour.
  for (let index = 0; index < palette.length; index++) {
    const entry = palette[index];
    const distance =
      (entry.r - r) ** 2 + (entry.g - g) ** 2 + (entry.b - b) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  }

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

  // One slot per possible RGB colour, holding the palette index plus one so
  // that zero can mean "not worked out yet" and the array needs no filling.
  // A Map would hash on every one of the image's pixels and could grow to
  // sixteen million entries; this is a fixed 16 MB of lazily-paged memory and
  // a plain array read. The palette is capped at MAX_COLOURS, so an index
  // always fits in a byte; anything longer skips the cache rather than
  // silently wrapping round.
  const cache = palette.length < 255 ? new Uint8Array(1 << 24) : undefined;
  // Flattened so the inner loop reads numbers rather than chasing objects.
  const flat = new Uint8Array(palette.length * 3);
  for (let index = 0; index < palette.length; index++) {
    flat[index * 3] = palette[index].r;
    flat[index * 3 + 1] = palette[index].g;
    flat[index * 3 + 2] = palette[index].b;
  }

  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < ALPHA_FLOOR) continue;

    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const key = (red << 16) | (green << 8) | blue;

    let slot = cache?.[key] ?? 0;
    if (slot === 0) {
      slot = nearestIndexIn(palette, red, green, blue) + 1;
      if (cache) cache[key] = slot;
    }

    const at = (slot - 1) * 3;
    data[index] = flat[at];
    data[index + 1] = flat[at + 1];
    data[index + 2] = flat[at + 2];
  }

  return data;
}

/**
 * Pixel grids and masks: the maths behind the fill bucket, the magic wand and
 * pixel selections. A mask is one byte per pixel, 0 (out) to 255 (in).
 */

import type { Bounds } from "@/lib/image/editor/document";

export interface PixelGrid {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export type Rgba = readonly [number, number, number, number];

export type MaskMode = "replace" | "add" | "subtract";

/** A mask pixel counts as selected from half-way up, so soft edges split evenly. */
const INSIDE = 128;

function similar(
  data: Uint8ClampedArray,
  offset: number,
  seed: Rgba,
  tolerance: number,
): boolean {
  const alpha = data[offset + 3];
  // Fully transparent pixels match each other whatever colour they hold.
  if (alpha === 0 && seed[3] === 0) return true;
  return (
    Math.abs(data[offset] - seed[0]) <= tolerance &&
    Math.abs(data[offset + 1] - seed[1]) <= tolerance &&
    Math.abs(data[offset + 2] - seed[2]) <= tolerance &&
    Math.abs(alpha - seed[3]) <= tolerance
  );
}

/**
 * The pixels joined to (x, y) whose colour is within `tolerance` (0–255 on
 * each channel) of it, found with a scanline fill. `null` when the point is
 * off the grid.
 */
export function floodRegion(
  grid: PixelGrid,
  x: number,
  y: number,
  tolerance: number,
): Uint8Array | null {
  const { data, width, height } = grid;
  const sx = Math.floor(x);
  const sy = Math.floor(y);
  if (sx < 0 || sy < 0 || sx >= width || sy >= height) return null;

  const start = (sy * width + sx) * 4;
  const seed: Rgba = [
    data[start],
    data[start + 1],
    data[start + 2],
    data[start + 3],
  ];
  const mask = new Uint8Array(width * height);
  const open = (index: number) =>
    mask[index] === 0 && similar(data, index * 4, seed, tolerance);
  const stack = [sy * width + sx];

  while (stack.length > 0) {
    const index = stack.pop() as number;
    if (!open(index)) continue;
    const row = Math.floor(index / width);
    const base = row * width;
    let left = index - base;
    let right = left;
    while (left > 0 && open(base + left - 1)) left -= 1;
    while (right < width - 1 && open(base + right + 1)) right += 1;

    let above = false;
    let below = false;
    for (let column = left; column <= right; column += 1) {
      const at = base + column;
      mask[at] = 255;
      if (row > 0) {
        const up = open(at - width);
        if (up && !above) stack.push(at - width);
        above = up;
      }
      if (row < height - 1) {
        const down = open(at + width);
        if (down && !below) stack.push(at + width);
        below = down;
      }
    }
  }
  return mask;
}

/** Joins a new mask onto an existing one: replacing it, adding to it or cutting from it. */
export function combineMasks(
  current: Uint8Array | null,
  next: Uint8Array,
  mode: MaskMode,
): Uint8Array {
  if (mode === "replace") return next;
  if (!current) return mode === "add" ? next : new Uint8Array(next.length);
  const out = new Uint8Array(next.length);
  for (let i = 0; i < next.length; i += 1) {
    out[i] =
      mode === "add"
        ? Math.max(current[i], next[i])
        : Math.max(0, current[i] - next[i]);
  }
  return out;
}

export function invertMask(mask: Uint8Array): Uint8Array {
  return mask.map((value) => 255 - value);
}

/** Spreads every selected pixel `radius` pixels out in each direction (a square). */
export function dilateMask(
  mask: Uint8Array,
  width: number,
  height: number,
  radius: number,
): Uint8Array {
  const spread = (
    source: Uint8Array,
    along: (at: number, step: number) => number | null,
  ) =>
    source.map((_, index) => {
      let most = 0;
      for (let step = -radius; step <= radius; step += 1) {
        const at = along(index, step);
        if (at !== null) most = Math.max(most, source[at]);
      }
      return most;
    });
  const across = spread(mask, (index, step) => {
    const x = (index % width) + step;
    return x >= 0 && x < width ? index + step : null;
  });
  return spread(across, (index, step) => {
    const y = Math.floor(index / width) + step;
    return y >= 0 && y < height ? index + step * width : null;
  });
}

/** The smallest box around the selected pixels, or `null` when nothing is selected. */
export function maskBounds(
  mask: Uint8Array,
  width: number,
  height: number,
): Bounds | null {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x] < INSIDE) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      bottom = y;
    }
  }
  return right < 0
    ? null
    : { left, top, width: right - left + 1, height: bottom - top + 1 };
}

/**
 * The edges between selected and unselected pixels, as flat `x1, y1, x2, y2`
 * runs along the pixel grid, for drawing the marching ants. Neighbouring edges
 * on one line are merged so a straight side is a single run.
 */
export function maskOutline(
  mask: Uint8Array,
  width: number,
  height: number,
): number[] {
  const inside = (x: number, y: number) =>
    x >= 0 &&
    y >= 0 &&
    x < width &&
    y < height &&
    mask[y * width + x] >= INSIDE;
  const runs: number[] = [];

  for (let y = 0; y <= height; y += 1) {
    let start = -1;
    for (let x = 0; x <= width; x += 1) {
      const edge = x < width && inside(x, y - 1) !== inside(x, y);
      if (edge && start < 0) start = x;
      if (!edge && start >= 0) {
        runs.push(start, y, x, y);
        start = -1;
      }
    }
  }
  for (let x = 0; x <= width; x += 1) {
    let start = -1;
    for (let y = 0; y <= height; y += 1) {
      const edge = y < height && inside(x - 1, y) !== inside(x, y);
      if (edge && start < 0) start = y;
      if (!edge && start >= 0) {
        runs.push(x, start, x, y);
        start = -1;
      }
    }
  }
  return runs;
}

/** `#rrggbb` (or `#rgb`) as channel values, with the alpha given. */
export function hexToRgba(hex: string, alpha = 255): Rgba {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? [...value].map((c) => c + c).join("")
      : value.slice(0, 6);
  const n = Number.parseInt(full, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, alpha];
}

/** A CSS colour from a hex colour and an opacity of 0–100. */
export function withOpacity(hex: string, opacity: number): string {
  const [r, g, b] = hexToRgba(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.min(100, Math.max(0, opacity)) / 100})`;
}

/** Hex for a pixel, ignoring its alpha. */
export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** Pixels coloured `colour` wherever the mask is set, transparent elsewhere. */
export function paintMask(mask: Uint8Array, colour: Rgba): Uint8ClampedArray {
  const out = new Uint8ClampedArray(mask.length * 4);
  for (let i = 0; i < mask.length; i += 1) {
    if (mask[i] === 0) continue;
    out[i * 4] = colour[0];
    out[i * 4 + 1] = colour[1];
    out[i * 4 + 2] = colour[2];
    out[i * 4 + 3] = Math.round((colour[3] * mask[i]) / 255);
  }
  return out;
}

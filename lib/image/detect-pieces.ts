/**
 * Finding the separate pieces on a clip art sheet: every island of
 * non-backdrop pixels, with islands closer than a gap joined into one piece
 * so a character's loose sparkles stay with the character.
 */

import {
  findBackdrop,
  matchesBackdrop,
  type Backdrop,
  type PixelGrid,
} from "@/lib/image/backdrop";
import type { Rect } from "@/lib/image/cut-rect";

export interface DetectSettings {
  /** How far a pixel may stray from the backdrop and still count as it, 0–255. */
  tolerance: number;
  /** Islands closer than this many pixels become one piece. */
  gap: number;
}

export const DEFAULT_DETECT_SETTINGS: DetectSettings = {
  tolerance: 32,
  gap: 8,
};

export const MAX_GAP = 64;

/** More than this and it is a photo or a pattern, not a sheet of pieces. */
export const MAX_PIECES = 200;

/** An island smaller than this share of the image is noise: JPEG speckle, dust. */
const MIN_SHARE = 0.0001;

/** A piece spanning this much of both sides is the whole picture, not a piece of it. */
const WHOLE_IMAGE = 0.98;

interface Island extends Rect {
  pixels: number;
}

function foregroundMask(
  grid: PixelGrid,
  backdrop: Backdrop,
  tolerance: number,
): Uint8Array {
  const mask = new Uint8Array(grid.width * grid.height);
  for (let pixel = 0; pixel < mask.length; pixel++) {
    mask[pixel] = matchesBackdrop(grid.data, pixel * 4, backdrop, tolerance)
      ? 0
      : 1;
  }
  return mask;
}

/** One pass of a sliding-window maximum along every row (or column). */
function dilateLines(
  source: Uint8Array,
  lines: number,
  length: number,
  index: (line: number, step: number) => number,
  gap: number,
): Uint8Array {
  const out = new Uint8Array(source.length);
  for (let line = 0; line < lines; line++) {
    let count = 0;
    for (let step = 0; step < Math.min(gap, length); step++)
      count += source[index(line, step)];
    for (let step = 0; step < length; step++) {
      if (step + gap < length) count += source[index(line, step + gap)];
      if (step - gap - 1 >= 0) count -= source[index(line, step - gap - 1)];
      out[index(line, step)] = count > 0 ? 1 : 0;
    }
  }
  return out;
}

/** Grow every foreground pixel into a square `gap` pixels wide each way. */
function dilate(
  mask: Uint8Array,
  width: number,
  height: number,
  gap: number,
): Uint8Array {
  if (gap <= 0) return mask;
  const rows = dilateLines(mask, height, width, (y, x) => y * width + x, gap);
  return dilateLines(rows, width, height, (x, y) => y * width + x, gap);
}

/**
 * Label the 8-connected regions of `joined`, but measure each one by the
 * real foreground inside it, so the dilation never pads a piece's box.
 */
function findIslands(
  mask: Uint8Array,
  joined: Uint8Array,
  width: number,
  height: number,
) {
  const seen = new Uint8Array(mask.length);
  const stack = new Int32Array(mask.length);
  const islands: Island[] = [];

  for (let start = 0; start < mask.length; start++) {
    if (!joined[start] || seen[start]) continue;
    seen[start] = 1;
    stack[0] = start;
    let top = 1;
    let [minX, minY, maxX, maxY, pixels] = [width, height, -1, -1, 0];

    while (top > 0) {
      const pixel = stack[--top];
      const x = pixel % width;
      const y = (pixel - x) / width;
      if (mask[pixel]) {
        pixels++;
        [minX, minY] = [Math.min(minX, x), Math.min(minY, y)];
        [maxX, maxY] = [Math.max(maxX, x), Math.max(maxY, y)];
      }
      for (
        let ny = Math.max(y - 1, 0);
        ny <= Math.min(y + 1, height - 1);
        ny++
      ) {
        for (
          let nx = Math.max(x - 1, 0);
          nx <= Math.min(x + 1, width - 1);
          nx++
        ) {
          const next = ny * width + nx;
          if (joined[next] && !seen[next]) {
            seen[next] = 1;
            stack[top++] = next;
          }
        }
      }
    }

    if (pixels > 0) {
      islands.push({
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        pixels,
      });
    }
  }
  return islands;
}

/** Top to bottom in rows, left to right within a row, the way a sheet is read. */
export function readingOrder<T extends Rect>(pieces: T[]): T[] {
  const rows: T[][] = [];
  for (const piece of [...pieces].sort((a, b) => a.y - b.y)) {
    const row = rows.at(-1);
    const rowBottom = row
      ? Math.min(...row.map(({ y, height }) => y + height))
      : -Infinity;
    if (row && piece.y < rowBottom) row.push(piece);
    else rows.push([piece]);
  }
  return rows.flatMap((row) => row.sort((a, b) => a.x - b.x));
}

/** The bounding box of every piece on the sheet, in reading order. */
export function detectPieces(
  grid: PixelGrid,
  settings: DetectSettings,
  backdrop: Backdrop = findBackdrop(grid),
): Rect[] {
  const { width, height } = grid;
  const mask = foregroundMask(grid, backdrop, settings.tolerance);
  const joined = dilate(mask, width, height, Math.round(settings.gap));
  const minPixels = Math.max(4, width * height * MIN_SHARE);

  const pieces = findIslands(mask, joined, width, height)
    .filter(
      (island) =>
        island.pixels >= minPixels &&
        !(
          island.width >= width * WHOLE_IMAGE &&
          island.height >= height * WHOLE_IMAGE
        ),
    )
    .sort((a, b) => b.pixels - a.pixels)
    .slice(0, MAX_PIECES)
    .map(({ x, y, width: w, height: h }) => ({ x, y, width: w, height: h }));

  return readingOrder(pieces);
}

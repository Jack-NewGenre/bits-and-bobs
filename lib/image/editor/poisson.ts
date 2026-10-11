/**
 * Healing brush maths, adapted from PhotoCraft's `poisson.rs` (MIT OR Apache-2.0, see
 * THIRD_PARTY_NOTICES.md). Poisson seamless cloning (Pérez, Gangnet and Blake, 2003) keeps the
 * source's gradients while matching the target at the stroke's edge. The solution splits as
 * `source + h`, where `h` is the harmonic (membrane) interpolant of `target - source` on the
 * boundary, so only a Laplace equation is solved: by SOR, seeded coarse-to-fine from a pyramid.
 */

/** Pixels being healed, all the same size. */
export interface HealInput {
  /** RGBA pixels being painted on (the boundary colours come from here). */
  target: Uint8ClampedArray;
  /** RGBA pixels copied from the clone source, already aligned to target (same size). */
  source: Uint8ClampedArray;
  /** One byte per pixel, 0–255: how strongly each pixel is healed (a soft brush stroke's alpha). */
  mask: Uint8Array | Uint8ClampedArray;
  width: number;
  height: number;
}

/** Largest per-sweep change, in 8-bit units, at which SOR stops early. */
const TOLERANCE = 0.005;
const FINE_SWEEPS = 30;
const FINE_OMEGA = 1.7;
const COARSE_SWEEPS = 2000;
const COARSE_OMEGA = 1.85;
const MAX_DEPTH = 16;

const LEFT = 1;
const RIGHT = 2;
const UP = 4;
const DOWN = 8;

interface Level {
  w: number;
  h: number;
  /** 1 where the value is solved for, 0 where it is a fixed (Dirichlet) value. */
  unknown: Uint8Array;
  /** Unknown pixel indices, and which of their four neighbours lie inside the grid. */
  cells: Int32Array;
  sides: Uint8Array;
}

interface Box {
  x0: number;
  y0: number;
  w: number;
  h: number;
}

function makeLevel(w: number, h: number, unknown: Uint8Array): Level {
  let count = 0;
  for (let i = 0; i < unknown.length; i++) count += unknown[i];
  const cells = new Int32Array(count);
  const sides = new Uint8Array(count);
  let k = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!unknown[i]) continue;
      cells[k] = i;
      sides[k++] =
        (x > 0 ? LEFT : 0) |
        (x + 1 < w ? RIGHT : 0) |
        (y > 0 ? UP : 0) |
        (y + 1 < h ? DOWN : 0);
    }
  }
  return { w, h, unknown, cells, sides };
}

/** Halves the grid until it is small: a coarse pixel is known if any of its children is. */
function buildPyramid(finest: Level): Level[] {
  const levels = [finest];
  let level = finest;
  while (
    level.w >= 8 &&
    level.h >= 8 &&
    level.cells.length > 64 &&
    levels.length <= MAX_DEPTH
  ) {
    const cw = Math.ceil(level.w / 2);
    const ch = Math.ceil(level.h / 2);
    const unknown = new Uint8Array(cw * ch).fill(1);
    for (let y = 0; y < level.h; y++) {
      for (let x = 0; x < level.w; x++) {
        if (!level.unknown[y * level.w + x])
          unknown[(y >> 1) * cw + (x >> 1)] = 0;
      }
    }
    level = makeLevel(cw, ch, unknown);
    levels.push(level);
  }
  return levels;
}

function sor(level: Level, v: Float32Array, sweeps: number, omega: number) {
  const { w, cells, sides } = level;
  for (let sweep = 0; sweep < sweeps; sweep++) {
    let maxDelta = 0;
    for (let k = 0; k < cells.length; k++) {
      const i = cells[k];
      const m = sides[k];
      let sum = 0;
      let n = 0;
      if (m & LEFT) {
        sum += v[i - 1];
        n++;
      }
      if (m & RIGHT) {
        sum += v[i + 1];
        n++;
      }
      if (m & UP) {
        sum += v[i - w];
        n++;
      }
      if (m & DOWN) {
        sum += v[i + w];
        n++;
      }
      if (n === 0) continue;
      const delta = sum / n - v[i];
      v[i] += omega * delta;
      if (Math.abs(delta) > maxDelta) maxDelta = Math.abs(delta);
    }
    if (maxDelta < TOLERANCE) return;
  }
}

/** Solves `Δv = 0` on the unknown pixels of `levels[depth]`, in place (cascadic multigrid). */
function solveMembrane(levels: Level[], depth: number, v: Float32Array) {
  const level = levels[depth];
  const { w, h, unknown } = level;
  const coarse = levels[depth + 1];
  if (!coarse) {
    let sum = 0;
    let known = 0;
    for (let i = 0; i < v.length; i++) {
      if (unknown[i]) continue;
      sum += v[i];
      known++;
    }
    const mean = known ? sum / known : 0;
    for (const i of level.cells) v[i] = mean;
    sor(level, v, COARSE_SWEEPS, COARSE_OMEGA);
    return;
  }

  // Restrict: a known coarse pixel takes the mean of its known children.
  const cw = coarse.w;
  const ch = coarse.h;
  const cv = new Float32Array(cw * ch);
  const counts = new Uint8Array(cw * ch);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (unknown[i]) continue;
      const c = (y >> 1) * cw + (x >> 1);
      cv[c] += v[i];
      counts[c]++;
    }
  }
  for (let c = 0; c < cv.length; c++) if (counts[c]) cv[c] /= counts[c];
  solveMembrane(levels, depth + 1, cv);

  // Prolong: bilinear sample of the coarse solution as the starting guess.
  for (let y = 0; y < h; y++) {
    const fy = Math.min(Math.max((y + 0.5) / 2 - 0.5, 0), ch - 1);
    const y0 = Math.floor(fy);
    const y1 = Math.min(y0 + 1, ch - 1);
    const ty = fy - y0;
    for (let x = 0; x < w; x++) {
      if (!unknown[y * w + x]) continue;
      const fx = Math.min(Math.max((x + 0.5) / 2 - 0.5, 0), cw - 1);
      const x0 = Math.floor(fx);
      const x1 = Math.min(x0 + 1, cw - 1);
      const tx = fx - x0;
      const a = cv[y0 * cw + x0] + (cv[y0 * cw + x1] - cv[y0 * cw + x0]) * tx;
      const b = cv[y1 * cw + x0] + (cv[y1 * cw + x1] - cv[y1 * cw + x0]) * tx;
      v[y * w + x] = a + (b - a) * ty;
    }
  }
  sor(level, v, FINE_SWEEPS, FINE_OMEGA);
}

/** The mask's bounding box, grown by one pixel for the boundary and clamped to the image. */
function maskBox(
  mask: HealInput["mask"],
  width: number,
  height: number,
): Box | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  const x0 = Math.max(minX - 1, 0);
  const y0 = Math.max(minY - 1, 0);
  return {
    x0,
    y0,
    w: Math.min(maxX + 2, width) - x0,
    h: Math.min(maxY + 2, height) - y0,
  };
}

/**
 * Heals `target` with `source`: inside the mask, the source's texture relit to match the target
 * colours at the mask's edge, blended with the target by the mask's strength. Pixels outside the
 * mask and every alpha value are left as the target has them.
 */
export function healPixels({
  target,
  source,
  mask,
  width,
  height,
}: HealInput): Uint8ClampedArray {
  const out = new Uint8ClampedArray(target);
  const box = maskBox(mask, width, height);
  if (!box) return out;

  const unknown = new Uint8Array(box.w * box.h);
  for (let y = 0; y < box.h; y++) {
    for (let x = 0; x < box.w; x++) {
      unknown[y * box.w + x] = mask[(box.y0 + y) * width + box.x0 + x] ? 1 : 0;
    }
  }
  const levels = buildPyramid(makeLevel(box.w, box.h, unknown));
  const offset = new Float32Array(box.w * box.h);

  for (let channel = 0; channel < 3; channel++) {
    for (let y = 0; y < box.h; y++) {
      for (let x = 0; x < box.w; x++) {
        const p = ((box.y0 + y) * width + box.x0 + x) * 4 + channel;
        offset[y * box.w + x] = target[p] - source[p];
      }
    }
    solveMembrane(levels, 0, offset);
    for (const i of levels[0].cells) {
      const x = i % box.w;
      const y = (i - x) / box.w;
      const pixel = (box.y0 + y) * width + box.x0 + x;
      const p = pixel * 4 + channel;
      const healed = Math.min(Math.max(source[p] + offset[i], 0), 255);
      out[p] = target[p] + (healed - target[p]) * (mask[pixel] / 255);
    }
  }
  return out;
}

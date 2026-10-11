/**
 * Content-aware fill: multi-scale PatchMatch completion of a hole from its surroundings, adapted
 * from PhotoCraft's `content_aware.rs` (MIT OR Apache-2.0, see THIRD_PARTY_NOTICES.md).
 */

import type { PixelGrid } from "@/lib/image/editor/pixels";
import {
  buildLevel,
  createRandom,
  fieldCosts,
  patchMatchPass,
  randomCentre,
  randomField,
  vote,
  type PatchLevel,
} from "@/lib/image/editor/patch-match";

export interface ContentAwareOptions {
  /** Side of the square patches compared, in pixels (default 7). */
  patchSize?: number;
  seed?: number;
  onProgress?: (fraction: number) => void;
}

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const COARSE_ITERATIONS = 10;
const MIN_ITERATIONS = 3;
const PASSES_PER_ITERATION = 2;

function holeBounds(
  hole: Uint8Array,
  width: number,
  height: number,
): Box | null {
  let box: Box | null = null;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (hole[y * width + x] < 128) continue;
      if (!box) box = { x0: x, y0: y, x1: x + 1, y1: y + 1 };
      box.x0 = Math.min(box.x0, x);
      box.x1 = Math.max(box.x1, x + 1);
      box.y1 = y + 1;
    }
  }
  return box;
}

/** The sampling window: the hole's box grown by about its own size each way. */
function samplingWindow(
  box: Box,
  width: number,
  height: number,
  patchSize: number,
): Box {
  const w = Math.max(box.x1 - box.x0, 24);
  const h = Math.max(box.y1 - box.y0, 24);
  const margin = Math.ceil(Math.max(Math.sqrt(w * h), patchSize * 4));
  return {
    x0: Math.max(0, box.x0 - margin),
    y0: Math.max(0, box.y0 - margin),
    x1: Math.min(width, box.x1 + margin),
    y1: Math.min(height, box.y1 + margin),
  };
}

function cropLevel(
  image: PixelGrid,
  hole: Uint8Array,
  crop: Box,
  radius: number,
): PatchLevel {
  const width = crop.x1 - crop.x0;
  const height = crop.y1 - crop.y0;
  const colour = new Float32Array(width * height * 4);
  const cropHole = new Uint8Array(width * height);
  const sourceOk = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const j = (crop.y0 + y) * image.width + crop.x0 + x;
      for (let c = 0; c < 4; c++) colour[i * 4 + c] = image.data[j * 4 + c];
      cropHole[i] = hole[j] >= 128 ? 1 : 0;
      sourceOk[i] = cropHole[i] ? 0 : 1;
    }
  }
  return buildLevel(width, height, radius, colour, cropHole, sourceOk);
}

/** Halves a level: a coarse pixel is hole if any child is, and a source only if every child is. */
function downsample(fine: PatchLevel): PatchLevel {
  const width = Math.ceil(fine.width / 2);
  const height = Math.ceil(fine.height / 2);
  const colour = new Float32Array(width * height * 4);
  const hole = new Uint8Array(width * height);
  const sourceOk = new Uint8Array(width * height).fill(1);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      let count = 0;
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const fx = x * 2 + dx;
          const fy = y * 2 + dy;
          if (fx >= fine.width || fy >= fine.height) continue;
          const j = fy * fine.width + fx;
          count++;
          if (fine.hole[j]) hole[i] = 1;
          if (!fine.sourceOk[j]) sourceOk[i] = 0;
          for (let c = 0; c < 4; c++)
            colour[i * 4 + c] += fine.colour[j * 4 + c];
        }
      }
      for (let c = 0; c < 4; c++) colour[i * 4 + c] /= count;
      if (hole[i]) sourceOk[i] = 0;
    }
  }
  return buildLevel(width, height, fine.radius, colour, hole, sourceOk);
}

function buildPyramid(finest: PatchLevel, holeExtent: number): PatchLevel[] {
  const pyramid = [finest];
  let extent = holeExtent;
  const patch = finest.radius * 2 + 1;
  while (extent > patch * 2) {
    const last = pyramid[pyramid.length - 1];
    if (Math.min(last.width, last.height) < patch * 6) break;
    const coarse = downsample(last);
    if (coarse.centres.length === 0) break;
    pyramid.push(coarse);
    extent = Math.ceil(extent / 2);
  }
  return pyramid;
}

/** Onion peel: fills the hole inwards, each pixel the mean of its already-known neighbours. */
function fillFromBoundary(level: PatchLevel): void {
  const { width, height, colour, hole } = level;
  const known = Uint8Array.from(hole, (h) => (h ? 0 : 1));
  let remaining = hole.reduce((total, h) => total + h, 0);
  while (remaining > 0) {
    const layer: number[] = [];
    for (let i = 0; i < known.length; i++) {
      if (known[i]) continue;
      const x = i % width;
      const y = (i - x) / width;
      const sum = [0, 0, 0, 0];
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (
            nx < 0 ||
            nx >= width ||
            ny < 0 ||
            ny >= height ||
            !known[ny * width + nx]
          )
            continue;
          const n = (ny * width + nx) * 4;
          for (let c = 0; c < 4; c++) sum[c] += colour[n + c];
          count++;
        }
      }
      if (count === 0) continue;
      for (let c = 0; c < 4; c++) colour[i * 4 + c] = sum[c] / count;
      layer.push(i);
    }
    if (layer.length === 0) return;
    for (const i of layer) known[i] = 1;
    remaining -= layer.length;
  }
}

/** Carries a coarse field up a level, falling back to a random source where it lands badly. */
function upscaleField(
  coarse: PatchLevel,
  coarseField: Int32Array,
  fine: PatchLevel,
  random: () => number,
): Int32Array {
  const field = new Int32Array(fine.width * fine.height).fill(-1);
  for (const t of fine.targets) {
    const x = t % fine.width;
    const y = (t - x) / fine.width;
    const c =
      Math.min(y >> 1, coarse.height - 1) * coarse.width +
      Math.min(x >> 1, coarse.width - 1);
    let candidate = -1;
    if (coarse.isTarget[c]) {
      const s = coarseField[c];
      const sx = (s % coarse.width) * 2 + (x & 1);
      const sy = Math.floor(s / coarse.width) * 2 + (y & 1);
      if (sx < fine.width && sy < fine.height) candidate = sy * fine.width + sx;
    }
    field[t] =
      candidate >= 0 && fine.centreOk[candidate]
        ? candidate
        : randomCentre(fine, random);
  }
  return field;
}

function iterationsAt(depth: number): number {
  return Math.max(MIN_ITERATIONS, COARSE_ITERATIONS >> depth);
}

/** Coarse-to-fine EM: PatchMatch then voting, several times per level. */
function solve(
  pyramid: PatchLevel[],
  random: () => number,
  onProgress?: (fraction: number) => void,
): Int32Array | null {
  const coarsest = pyramid.length - 1;
  if (pyramid[coarsest].centres.length === 0) return null;
  const total = pyramid.reduce(
    (sum, level, i) => sum + level.targets.length * iterationsAt(coarsest - i),
    0,
  );
  let done = 0;
  let field: Int32Array = new Int32Array(0);

  for (let li = coarsest; li >= 0; li--) {
    const level = pyramid[li];
    if (li === coarsest) {
      fillFromBoundary(level);
      field = randomField(level, random);
    } else {
      field = upscaleField(pyramid[li + 1], field, level, random);
      vote(level, field, fieldCosts(level, field));
    }

    const iterations = iterationsAt(coarsest - li);
    for (let it = 0; it < iterations; it++) {
      const cost = fieldCosts(level, field);
      for (let pass = 0; pass < PASSES_PER_ITERATION; pass++) {
        patchMatchPass(level, field, cost, (it + pass) % 2 === 1, random);
      }
      if (li > 0 || it < iterations - 1) vote(level, field, cost);
      done += level.targets.length;
      onProgress?.(Math.min(done / Math.max(total, 1), 0.99));
    }
  }
  return field;
}

/**
 * Fills the pixels where `hole >= 128` from the rest of the image. Returns new RGBA pixels with
 * everything outside the hole unchanged. Transparency counts as texture, so a hole on an empty
 * part of a layer stays empty rather than filling with whatever the layer holds elsewhere.
 */
export function contentAwareFill(
  image: PixelGrid,
  hole: Uint8Array,
  options: ContentAwareOptions = {},
): Uint8ClampedArray<ArrayBuffer> {
  const { patchSize = 7, seed = 1, onProgress } = options;
  const out = new Uint8ClampedArray(image.data);
  const box = holeBounds(hole, image.width, image.height);
  if (!box) {
    onProgress?.(1);
    return out;
  }

  const radius = Math.max(1, Math.floor(patchSize / 2));
  const crop = samplingWindow(box, image.width, image.height, radius * 2 + 1);
  const finest = cropLevel(image, hole, crop, radius);
  const extent = Math.max(box.x1 - box.x0, box.y1 - box.y0);
  const field = solve(
    buildPyramid(finest, extent),
    createRandom(seed),
    onProgress,
  );
  if (!field) fillFromBoundary(finest);

  for (let i = 0; i < finest.hole.length; i++) {
    if (!finest.hole[i]) continue;
    const x = i % finest.width;
    const y = (i - x) / finest.width;
    const target = ((crop.y0 + y) * image.width + crop.x0 + x) * 4;
    if (field) {
      // Copying the matched source pixel exactly keeps texture sharp where averaging would blur.
      const s = field[i];
      const sx = s % finest.width;
      const sy = (s - sx) / finest.width;
      const source = ((crop.y0 + sy) * image.width + crop.x0 + sx) * 4;
      for (let c = 0; c < 4; c++) out[target + c] = image.data[source + c];
    } else {
      for (let c = 0; c < 4; c++) out[target + c] = finest.colour[i * 4 + c];
    }
  }
  onProgress?.(1);
  return out;
}

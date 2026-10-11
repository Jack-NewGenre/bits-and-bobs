/**
 * Distance fields and blurs over single-channel coverage maps (one float per
 * pixel, 0–1), adapted from PhotoCraft's `effects.rs` (MIT OR Apache-2.0, see
 * THIRD_PARTY_NOTICES.md). Everything outside a map counts as empty.
 */

const INF = 1e20;

/** Below this a pixel counts as empty (half of one 8-bit step). */
export const EMPTY = 0.5 / 255;

interface Scratch {
  f: Float32Array;
  d: Float32Array;
  near: Int32Array;
  v: Int32Array;
  z: Float64Array;
}

function scratch(n: number): Scratch {
  return {
    f: new Float32Array(n),
    d: new Float32Array(n),
    near: new Int32Array(n),
    v: new Int32Array(n),
    z: new Float64Array(n + 1),
  };
}

/** 1D squared distance transform (Felzenszwalb–Huttenlocher), keeping the nearest sample. */
function transform1d(s: Scratch, n: number): void {
  const { f, d, near, v, z } = s;
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  const meet = (q: number, p: number) =>
    (f[q] + q * q - (f[p] + p * p)) / (2 * q - 2 * p);
  for (let q = 1; q < n; q++) {
    let at = meet(q, v[k]);
    while (at <= z[k]) at = meet(q, v[--k]);
    k++;
    v[k] = q;
    z[k] = at;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const p = v[k];
    d[q] = (q - p) * (q - p) + f[p];
    near[q] = p;
  }
}

export interface DistanceField {
  /** Euclidean distance from each pixel centre to the nearest seed's centre. */
  distance: Float32Array;
  /** Index of that nearest seed. */
  nearest: Int32Array;
}

/** Exact Euclidean distance transform of the pixels where `seeds` is non-zero. */
export function distanceTransform(
  seeds: Uint8Array,
  width: number,
  height: number,
): DistanceField {
  const size = width * height;
  const columns = new Float32Array(size);
  const nearRow = new Int32Array(size);
  const s = scratch(Math.max(width, height));
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) s.f[y] = seeds[y * width + x] ? 0 : INF;
    transform1d(s, height);
    for (let y = 0; y < height; y++) {
      columns[y * width + x] = s.d[y];
      nearRow[y * width + x] = s.near[y];
    }
  }
  const distance = new Float32Array(size);
  const nearest = new Int32Array(size);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    s.f.set(columns.subarray(row, row + width));
    transform1d(s, width);
    for (let x = 0; x < width; x++) {
      const nx = s.near[x];
      distance[row + x] = Math.sqrt(s.d[x]);
      nearest[row + x] = nearRow[row + nx] * width + nx;
    }
  }
  return { distance, nearest };
}

/**
 * Distance from each pixel centre outside the shape to its edge, negative
 * inside. The edge within the nearest covered pixel is placed by that pixel's
 * coverage, so anti-aliased shapes give smooth distances.
 */
export function distanceOutside(
  alpha: Float32Array,
  width: number,
  height: number,
): Float32Array {
  const seeds = new Uint8Array(alpha.length);
  for (let i = 0; i < alpha.length; i++) seeds[i] = alpha[i] > EMPTY ? 1 : 0;
  const { distance, nearest } = distanceTransform(seeds, width, height);
  for (let i = 0; i < alpha.length; i++) {
    distance[i] = seeds[i]
      ? -0.5
      : distance[i] - 0.5 + (1 - Math.min(1, alpha[nearest[i]]));
  }
  return distance;
}

/** Distance from each pixel centre inside the shape to its edge, negative outside. */
export function distanceInside(
  alpha: Float32Array,
  width: number,
  height: number,
): Float32Array {
  const seeds = new Uint8Array(alpha.length);
  for (let i = 0; i < alpha.length; i++) seeds[i] = alpha[i] > EMPTY ? 0 : 1;
  const { distance } = distanceTransform(seeds, width, height);
  for (let i = 0; i < alpha.length; i++)
    distance[i] = seeds[i] ? -0.5 : distance[i] - 0.5;
  return distance;
}

/** One box pass of radius `r` from `src` into `dst`, as a running sum. */
function boxPass(
  src: Float32Array,
  dst: Float32Array,
  n: number,
  r: number,
): void {
  const scale = 1 / (2 * r + 1);
  let sum = 0;
  for (let i = 0; i < Math.min(r, n); i++) sum += src[i];
  for (let i = 0; i < n; i++) {
    if (i + r < n) sum += src[i + r];
    dst[i] = sum * scale;
    if (i - r >= 0) sum -= src[i - r];
  }
}

/** One vertical box pass of radius `r`, as running sums kept for a whole row at a time. */
function boxPassColumns(
  src: Float32Array,
  dst: Float32Array,
  width: number,
  height: number,
  r: number,
  sums: Float64Array,
): void {
  const scale = 1 / (2 * r + 1);
  sums.fill(0);
  for (let y = 0; y < Math.min(r, height); y++) {
    for (let x = 0, i = y * width; x < width; x++, i++) sums[x] += src[i];
  }
  for (let y = 0; y < height; y++) {
    const row = y * width;
    if (y + r < height) {
      for (let x = 0, i = row + r * width; x < width; x++, i++)
        sums[x] += src[i];
    }
    for (let x = 0; x < width; x++) dst[row + x] = sums[x] * scale;
    if (y - r >= 0) {
      for (let x = 0, i = row - r * width; x < width; x++, i++)
        sums[x] -= src[i];
    }
  }
}

/**
 * Blurs a map in place with three box passes each way (close to a Gaussian),
 * spreading each pixel at most `reach` pixels.
 */
export function boxBlur(
  map: Float32Array,
  width: number,
  height: number,
  reach: number,
): void {
  const total = Math.round(reach);
  if (total <= 0) return;
  const radii = [0, 1, 2]
    .map((i) => Math.floor((total + i) / 3))
    .filter((r) => r > 0);
  const a = new Float32Array(width);
  const b = new Float32Array(width);
  for (let row = 0; row < map.length; row += width) {
    a.set(map.subarray(row, row + width));
    let [src, dst] = [a, b];
    for (const r of radii) {
      boxPass(src, dst, width, r);
      [src, dst] = [dst, src];
    }
    map.set(src, row);
  }
  const spare = new Float32Array(map.length);
  const sums = new Float64Array(width);
  let [src, dst]: Float32Array[] = [map, spare];
  for (const r of radii) {
    boxPassColumns(src, dst, width, height, r, sums);
    [src, dst] = [dst, src];
  }
  if (src !== map) map.set(src);
}

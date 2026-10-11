/**
 * Exact squared Euclidean distance transform (Felzenszwalb and Huttenlocher),
 * in linear time: two passes of a one-dimensional lower envelope of parabolas.
 */

const FAR = 1e20;

function transform1d(
  f: Float64Array,
  n: number,
  out: Float64Array,
  hull: Int32Array,
  bounds: Float64Array,
): void {
  let k = 0;
  hull[0] = 0;
  bounds[0] = -FAR;
  bounds[1] = FAR;

  for (let q = 1; q < n; q++) {
    let s: number;
    do {
      const p = hull[k];
      s = (f[q] + q * q - (f[p] + p * p)) / (2 * q - 2 * p);
      if (s > bounds[k]) break;
      k--;
    } while (k >= 0);
    k++;
    hull[k] = q;
    bounds[k] = s;
    bounds[k + 1] = FAR;
  }

  k = 0;
  for (let q = 0; q < n; q++) {
    while (bounds[k + 1] < q) k++;
    const p = hull[k];
    out[q] = (q - p) * (q - p) + f[p];
  }
}

/**
 * The squared distance from every pixel to the nearest pixel where `isSeed`
 * is true. With no seeds at all, every distance is effectively infinite.
 */
export function squaredDistances(
  isSeed: (index: number) => boolean,
  width: number,
  height: number,
): Float64Array {
  const grid = new Float64Array(width * height);
  for (let i = 0; i < grid.length; i++) grid[i] = isSeed(i) ? 0 : FAR;

  const longest = Math.max(width, height);
  const line = new Float64Array(longest);
  const out = new Float64Array(longest);
  const hull = new Int32Array(longest);
  const bounds = new Float64Array(longest + 1);

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) line[y] = grid[y * width + x];
    transform1d(line, height, out, hull, bounds);
    for (let y = 0; y < height; y++) grid[y * width + x] = out[y];
  }

  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) line[x] = grid[row + x];
    transform1d(line, width, out, hull, bounds);
    for (let x = 0; x < width; x++) grid[row + x] = out[x];
  }

  return grid;
}

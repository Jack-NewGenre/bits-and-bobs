/**
 * PatchMatch search and patch voting for content-aware fill, adapted from PhotoCraft's
 * `inpaint.rs` (MIT OR Apache-2.0, see THIRD_PARTY_NOTICES.md).
 *
 * C. Barnes et al., *PatchMatch*, SIGGRAPH 2009, with the voting of Y. Wexler et al.,
 * *Space-Time Completion of Video*, IEEE TPAMI 2007.
 */

/** One pyramid level: RGBA colours (0–255 floats) plus the masks the search needs. */
export interface PatchLevel {
  width: number;
  height: number;
  radius: number;
  colour: Float32Array;
  /** 1 where the pixel is to be synthesised. */
  hole: Uint8Array;
  /** 1 where the pixel may be copied from: outside the hole. */
  sourceOk: Uint8Array;
  /** 1 where a whole patch centred here is in bounds and made only of usable source pixels. */
  centreOk: Uint8Array;
  /** Indices of every `centreOk` pixel, for random picks. */
  centres: Int32Array;
  /** Indices of every patch centre whose patch touches the hole, in scanline order. */
  targets: Int32Array;
  isTarget: Uint8Array;
}

/** Seeded mulberry32: deterministic floats in [0, 1). */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Summed-area table of a 0/1 mask, `(width + 1) × (height + 1)`. */
function integral(mask: Uint8Array, width: number, height: number): Int32Array {
  const table = new Int32Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      row += mask[y * width + x];
      table[(y + 1) * (width + 1) + x + 1] =
        table[y * (width + 1) + x + 1] + row;
    }
  }
  return table;
}

function boxSum(
  table: Int32Array,
  width: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  const stride = width + 1;
  return (
    table[y1 * stride + x1] -
    table[y0 * stride + x1] -
    table[y1 * stride + x0] +
    table[y0 * stride + x0]
  );
}

/** Derives the source centres and target centres of a level from its colours and masks. */
export function buildLevel(
  width: number,
  height: number,
  radius: number,
  colour: Float32Array,
  hole: Uint8Array,
  sourceOk: Uint8Array,
): PatchLevel {
  const size = width * height;
  const unusable = new Uint8Array(size);
  for (let i = 0; i < size; i++) unusable[i] = sourceOk[i] ? 0 : 1;
  const badTable = integral(unusable, width, height);
  const holeTable = integral(hole, width, height);

  const centreOk = new Uint8Array(size);
  const isTarget = new Uint8Array(size);
  const centres: number[] = [];
  const targets: number[] = [];
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(height, y + radius + 1);
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width, x + radius + 1);
      const inside =
        x - radius >= 0 &&
        x + radius < width &&
        y - radius >= 0 &&
        y + radius < height;
      if (inside && boxSum(badTable, width, x0, y0, x1, y1) === 0) {
        centreOk[i] = 1;
        centres.push(i);
      }
      if (boxSum(holeTable, width, x0, y0, x1, y1) > 0) {
        isTarget[i] = 1;
        targets.push(i);
      }
    }
  }
  return {
    width,
    height,
    radius,
    colour,
    hole,
    sourceOk,
    centreOk,
    centres: Int32Array.from(centres),
    targets: Int32Array.from(targets),
    isTarget,
  };
}

/**
 * Sum of squared RGBA differences between the patch at target `t` (clipped to the level) and
 * the patch at source `s`. Stops early once the sum reaches `cutoff`.
 */
export function patchDistance(
  level: PatchLevel,
  t: number,
  s: number,
  cutoff = Infinity,
) {
  const { width, height, radius, colour } = level;
  const tx = t % width;
  const ty = (t - tx) / width;
  const x0 = Math.max(-radius, -tx);
  const x1 = Math.min(radius, width - 1 - tx);
  const y0 = Math.max(-radius, -ty);
  const y1 = Math.min(radius, height - 1 - ty);
  const span = (x1 - x0 + 1) * 4;
  let sum = 0;
  for (let dy = y0; dy <= y1; dy++) {
    let ti = (t + dy * width + x0) * 4;
    let si = (s + dy * width + x0) * 4;
    const end = ti + span;
    while (ti < end) {
      const d = colour[ti++] - colour[si++];
      sum += d * d;
    }
    if (sum >= cutoff) return sum;
  }
  return sum;
}

/** A random usable source centre for every target. */
export function randomField(
  level: PatchLevel,
  random: () => number,
): Int32Array {
  const field = new Int32Array(level.width * level.height).fill(-1);
  for (const t of level.targets) field[t] = randomCentre(level, random);
  return field;
}

export function randomCentre(level: PatchLevel, random: () => number): number {
  return level.centres[Math.floor(random() * level.centres.length)];
}

/** Recomputes every target's cost against the level's current colours. */
export function fieldCosts(level: PatchLevel, field: Int32Array): Float64Array {
  const cost = new Float64Array(field.length);
  for (const t of level.targets) cost[t] = patchDistance(level, t, field[t]);
  return cost;
}

/** One PatchMatch sweep: propagation from already-visited neighbours, then random search. */
export function patchMatchPass(
  level: PatchLevel,
  field: Int32Array,
  cost: Float64Array,
  reverse: boolean,
  random: () => number,
): void {
  const { width, height, targets, isTarget, centreOk } = level;
  const size = width * height;
  const step = reverse ? 1 : -1;
  const maxRadius = Math.max(width, height);

  const visit = (t: number) => {
    let best = field[t];
    let bestCost = cost[t];
    const consider = (candidate: number) => {
      if (
        candidate < 0 ||
        candidate >= size ||
        candidate === best ||
        !centreOk[candidate]
      )
        return;
      const d = patchDistance(level, t, candidate, bestCost);
      if (d < bestCost) {
        best = candidate;
        bestCost = d;
      }
    };

    const tx = t % width;
    if (tx + step >= 0 && tx + step < width && isTarget[t + step]) {
      consider(field[t + step] - step);
    }
    const vertical = t + step * width;
    if (vertical >= 0 && vertical < size && isTarget[vertical]) {
      consider(field[vertical] - step * width);
    }

    for (let r = maxRadius; r >= 1; r >>= 1) {
      const bx = best % width;
      const by = (best - bx) / width;
      const x = bx + Math.round((random() * 2 - 1) * r);
      const y = by + Math.round((random() * 2 - 1) * r);
      if (x >= 0 && x < width && y >= 0 && y < height) consider(y * width + x);
    }
    field[t] = best;
    cost[t] = bestCost;
  };

  if (reverse) {
    for (let k = targets.length - 1; k >= 0; k--) visit(targets[k]);
  } else {
    for (let k = 0; k < targets.length; k++) visit(targets[k]);
  }
}

/**
 * Rewrites every hole pixel as the weighted mean of what the overlapping source patches say it
 * should be, better matches counting for more.
 */
export function vote(
  level: PatchLevel,
  field: Int32Array,
  cost: Float64Array,
): void {
  const { width, height, radius, colour, hole, targets } = level;
  const sums = new Float64Array(width * height * 4);
  const weights = new Float64Array(width * height);
  let meanCost = 0;
  for (const t of targets) meanCost += cost[t];
  meanCost = Math.max(meanCost / Math.max(targets.length, 1), 1e-6);

  for (const t of targets) {
    const s = field[t];
    const weight = Math.max(Math.exp(-cost[t] / meanCost), 1e-8);
    const tx = t % width;
    const ty = (t - tx) / width;
    for (let dy = -radius; dy <= radius; dy++) {
      if (ty + dy < 0 || ty + dy >= height) continue;
      for (let dx = -radius; dx <= radius; dx++) {
        if (tx + dx < 0 || tx + dx >= width) continue;
        const q = t + dy * width + dx;
        if (!hole[q]) continue;
        const p = (s + dy * width + dx) * 4;
        weights[q] += weight;
        sums[q * 4] += colour[p] * weight;
        sums[q * 4 + 1] += colour[p + 1] * weight;
        sums[q * 4 + 2] += colour[p + 2] * weight;
        sums[q * 4 + 3] += colour[p + 3] * weight;
      }
    }
  }

  for (let q = 0; q < weights.length; q++) {
    if (weights[q] === 0) continue;
    for (let c = 0; c < 4; c++)
      colour[q * 4 + c] = sums[q * 4 + c] / weights[q];
  }
}

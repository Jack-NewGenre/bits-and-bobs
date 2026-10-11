/**
 * Magnetic lasso maths, adapted from PhotoCraft's `magnetic.rs` (MIT OR Apache-2.0, see
 * THIRD_PARTY_NOTICES.md). Intelligent scissors (Mortensen & Barrett): a per-pixel edge cost, then
 * the cheapest 8-connected path between two points, searched in a corridor around them.
 */
import type { PixelGrid } from "@/lib/image/editor/pixels";
import type { Point2D } from "@/lib/image/editor/shapes";

/** Keeps a wire along an edge from costing nothing, so it still prefers the shorter run. */
const EDGE_FLOOR = 0.02;
const DEFAULT_MARGIN = 40;
const DIAGONAL = Math.SQRT2;
const NEIGHBOURS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Separable [1 2 1] / 4 blur with edge clamping, to quieten single-pixel noise. */
function blur(src: Float32Array, width: number, height: number): Float32Array {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const l = src[row + Math.max(0, x - 1)];
      const r = src[row + Math.min(width - 1, x + 1)];
      tmp[row + x] = (l + 2 * src[row + x] + r) / 4;
    }
  }
  for (let y = 0; y < height; y++) {
    const up = Math.max(0, y - 1) * width;
    const down = Math.min(height - 1, y + 1) * width;
    const row = y * width;
    for (let x = 0; x < width; x++) {
      out[row + x] = (tmp[up + x] + 2 * tmp[row + x] + tmp[down + x]) / 4;
    }
  }
  return out;
}

/** Squared Sobel gradient magnitude at every pixel, borders clamped. */
function sobel(
  src: Float32Array,
  width: number,
  height: number,
  into: Float32Array,
): void {
  for (let y = 0; y < height; y++) {
    const up = Math.max(0, y - 1) * width;
    const row = y * width;
    const down = Math.min(height - 1, y + 1) * width;
    for (let x = 0; x < width; x++) {
      const l = Math.max(0, x - 1);
      const r = Math.min(width - 1, x + 1);
      const gx =
        src[up + r] +
        2 * src[row + r] +
        src[down + r] -
        src[up + l] -
        2 * src[row + l] -
        src[down + l];
      const gy =
        src[down + l] +
        2 * src[down + x] +
        src[down + r] -
        src[up + l] -
        2 * src[up + x] -
        src[up + r];
      into[row + x] += gx * gx + gy * gy;
    }
  }
}

/**
 * Per-pixel cost of the wire passing through: low on strong edges, high on flat areas (0–1).
 * Computed once per document render.
 */
export function edgeCost(grid: PixelGrid): Float32Array {
  const { data, width, height } = grid;
  const size = width * height;
  const luma = new Float32Array(size);
  const alpha = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    const p = i * 4;
    const a = data[p + 3] / 255;
    // Premultiplied, so transparent pixels read as one flat colour whatever their RGB holds.
    luma[i] =
      ((0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]) / 255) * a;
    alpha[i] = a;
  }
  const magnitude = new Float32Array(size);
  sobel(blur(luma, width, height), width, height, magnitude);
  sobel(blur(alpha, width, height), width, height, magnitude);

  let max = 0;
  for (let i = 0; i < size; i++) max = Math.max(max, magnitude[i]);
  const cost = new Float32Array(size).fill(1);
  if (max === 0) return cost;
  const scale = 1 / Math.sqrt(max);
  for (let i = 0; i < size; i++) {
    cost[i] =
      EDGE_FLOOR + (1 - EDGE_FLOOR) * (1 - Math.sqrt(magnitude[i]) * scale);
  }
  return cost;
}

/** Min-heap of (key, node) pairs on typed arrays, with lazy deletion of stale entries. */
class NodeHeap {
  private keys = new Float64Array(1024);
  private nodes = new Int32Array(1024);
  size = 0;

  push(key: number, node: number): void {
    if (this.size === this.keys.length) {
      const keys = new Float64Array(this.size * 2);
      const nodes = new Int32Array(this.size * 2);
      keys.set(this.keys);
      nodes.set(this.nodes);
      this.keys = keys;
      this.nodes = nodes;
    }
    let i = this.size++;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.keys[parent] <= key) break;
      this.keys[i] = this.keys[parent];
      this.nodes[i] = this.nodes[parent];
      i = parent;
    }
    this.keys[i] = key;
    this.nodes[i] = node;
  }

  /** Removes the cheapest entry and returns its node; `topKey` must be read first if wanted. */
  pop(): number {
    const top = this.nodes[0];
    const last = --this.size;
    const key = this.keys[last];
    const node = this.nodes[last];
    let i = 0;
    for (;;) {
      let child = 2 * i + 1;
      if (child >= last) break;
      if (child + 1 < last && this.keys[child + 1] < this.keys[child]) child++;
      if (this.keys[child] >= key) break;
      this.keys[i] = this.keys[child];
      this.nodes[i] = this.nodes[child];
      i = child;
    }
    this.keys[i] = key;
    this.nodes[i] = node;
    return top;
  }

  get topKey(): number {
    return this.keys[0];
  }
}

function clampPoint(point: Point2D, width: number, height: number): Point2D {
  return {
    x: clamp(Math.round(point.x), 0, width - 1),
    y: clamp(Math.round(point.y), 0, height - 1),
  };
}

/**
 * The cheapest 8-connected pixel path from `from` to `to` (both inclusive, integer pixel coords,
 * clamped to the grid), searched only inside their bounding box grown by `margin`.
 */
export function liveWire(
  cost: Float32Array,
  width: number,
  height: number,
  from: Point2D,
  to: Point2D,
  margin = DEFAULT_MARGIN,
): Point2D[] {
  const start = clampPoint(from, width, height);
  const goal = clampPoint(to, width, height);
  if (start.x === goal.x && start.y === goal.y) return [start];

  const x0 = Math.max(0, Math.min(start.x, goal.x) - margin);
  const y0 = Math.max(0, Math.min(start.y, goal.y) - margin);
  const x1 = Math.min(width - 1, Math.max(start.x, goal.x) + margin);
  const y1 = Math.min(height - 1, Math.max(start.y, goal.y) + margin);
  const boxWidth = x1 - x0 + 1;
  const boxHeight = y1 - y0 + 1;
  const boxSize = boxWidth * boxHeight;

  const dist = new Float64Array(boxSize).fill(Infinity);
  const previous = new Int32Array(boxSize).fill(-1);
  const done = new Uint8Array(boxSize);
  const startNode = (start.y - y0) * boxWidth + (start.x - x0);
  const goalNode = (goal.y - y0) * boxWidth + (goal.x - x0);
  const heap = new NodeHeap();
  dist[startNode] = 0;
  heap.push(0, startNode);

  while (heap.size > 0) {
    const key = heap.topKey;
    const node = heap.pop();
    if (done[node] || key > dist[node]) continue;
    done[node] = 1;
    if (node === goalNode) break;
    const bx = node % boxWidth;
    const by = (node - bx) / boxWidth;
    for (const [dx, dy] of NEIGHBOURS) {
      const nx = bx + dx;
      const ny = by + dy;
      if (nx < 0 || ny < 0 || nx >= boxWidth || ny >= boxHeight) continue;
      const next = ny * boxWidth + nx;
      if (done[next]) continue;
      const step =
        cost[(ny + y0) * width + nx + x0] *
        (dx !== 0 && dy !== 0 ? DIAGONAL : 1);
      const candidate = key + step;
      if (candidate < dist[next]) {
        dist[next] = candidate;
        previous[next] = node;
        heap.push(candidate, next);
      }
    }
  }

  const path: Point2D[] = [];
  for (let node = goalNode; node !== -1; node = previous[node]) {
    const bx = node % boxWidth;
    path.push({ x: bx + x0, y: (node - bx) / boxWidth + y0 });
  }
  return path.reverse();
}

/**
 * The strongest-edge (lowest cost) pixel within `radius` of `point`, so anchors cling to edges
 * like Photoshop's. Returns the rounded point itself if nothing is better.
 */
export function snapToEdge(
  cost: Float32Array,
  width: number,
  height: number,
  point: Point2D,
  radius: number,
): Point2D {
  const centre = clampPoint(point, width, height);
  const reach = Math.max(0, Math.floor(radius));
  let best = centre;
  let bestCost = cost[centre.y * width + centre.x];
  let bestDistance = 0;
  for (
    let y = Math.max(0, centre.y - reach);
    y <= Math.min(height - 1, centre.y + reach);
    y++
  ) {
    for (
      let x = Math.max(0, centre.x - reach);
      x <= Math.min(width - 1, centre.x + reach);
      x++
    ) {
      const distance = (x - centre.x) ** 2 + (y - centre.y) ** 2;
      if (distance > radius * radius) continue;
      const value = cost[y * width + x];
      if (value < bestCost || (value === bestCost && distance < bestDistance)) {
        best = { x, y };
        bestCost = value;
        bestDistance = distance;
      }
    }
  }
  return best;
}

/**
 * Index along a wire where Photoshop-style auto-anchoring should fix a point: the furthest point at
 * most `spacing` px of path length from the start, or -1 if the wire is shorter than spacing.
 */
export function anchorIndex(wire: readonly Point2D[], spacing: number): number {
  if (spacing <= 0) return -1;
  let travelled = 0;
  for (let i = 1; i < wire.length; i++) {
    travelled += Math.hypot(
      wire[i].x - wire[i - 1].x,
      wire[i].y - wire[i - 1].y,
    );
    if (travelled > spacing) return i - 1;
  }
  return travelled >= spacing && wire.length > 1 ? wire.length - 1 : -1;
}

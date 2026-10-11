/**
 * Liquify maths, adapted from PhotoCraft's `liquify.rs` (MIT OR Apache-2.0, see
 * THIRD_PARTY_NOTICES.md). A dense backward displacement field, one node per pixel, is edited
 * by brush steps and then used to resample the layer.
 */
import type { Bounds } from "@/lib/image/editor/document";

export type LiquifyMode =
  "forward" | "twirl" | "pucker" | "bloat" | "reconstruct";

/** One brush step, in layer pixel coordinates. */
export interface LiquifyBrush {
  x: number;
  y: number;
  radius: number;
  /** Strength of this step, 0–1. */
  pressure: number;
  /** Pointer movement since the last step, used by the forward warp. */
  dx?: number;
  dy?: number;
  /** Twirl direction, clockwise unless `false`. */
  clockwise?: boolean;
}

/**
 * A backward displacement map: output pixel (x, y) shows the source at
 * (x + offsets[2i], y + offsets[2i + 1]). Starts at zero.
 */
export interface LiquifyField {
  width: number;
  height: number;
  offsets: Float32Array;
}

const TWIRL_RATE = 0.12;
const PUCKER_RATE = 0.06;
/** Offsets smaller than this (in pixels) make no visible difference. */
const EPSILON = 1e-3;

/** A zero (identity) field of the given size. */
export function createField(width: number, height: number): LiquifyField {
  return { width, height, offsets: new Float32Array(width * height * 2) };
}

/** Whether the field leaves every pixel where it is. */
export function isIdentityField(field: LiquifyField): boolean {
  return field.offsets.every((v) => Math.abs(v) < EPSILON);
}

/** Bilinear read of the field at grid coordinates, clamped to the edges, into `out`. */
function sampleField(
  field: LiquifyField,
  gx: number,
  gy: number,
  out: Float64Array,
): void {
  const { width: w, height: h, offsets } = field;
  const x = Math.min(Math.max(gx, 0), w - 1);
  const y = Math.min(Math.max(gy, 0), h - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const a = (y0 * w + x0) * 2;
  const b = (y0 * w + Math.min(x0 + 1, w - 1)) * 2;
  const c = (Math.min(y0 + 1, h - 1) * w + x0) * 2;
  const d = (Math.min(y0 + 1, h - 1) * w + Math.min(x0 + 1, w - 1)) * 2;
  for (let i = 0; i < 2; i++) {
    const top = offsets[a + i] + (offsets[b + i] - offsets[a + i]) * fx;
    const bottom = offsets[c + i] + (offsets[d + i] - offsets[c + i]) * fx;
    out[i] = top + (bottom - top) * fy;
  }
}

/** Writes into `out` the point whose current content should appear at node `(px, py)`. */
function sourcePoint(
  mode: Exclude<LiquifyMode, "reconstruct">,
  brush: LiquifyBrush,
  px: number,
  py: number,
  k: number,
  out: Float64Array,
): void {
  const ox = px - brush.x;
  const oy = py - brush.y;
  if (mode === "forward") {
    out[0] = px - k * (brush.dx ?? 0);
    out[1] = py - k * (brush.dy ?? 0);
  } else if (mode === "twirl") {
    // Content turns by +theta (clockwise on a y-down screen), so sample the point turned by -theta.
    const theta = k * TWIRL_RATE * (brush.clockwise === false ? -1 : 1);
    const sin = Math.sin(-theta);
    const cos = Math.cos(-theta);
    out[0] = brush.x + ox * cos - oy * sin;
    out[1] = brush.y + ox * sin + oy * cos;
  } else {
    // Pucker samples further out (content shrinks), bloat nearer in (content grows).
    const scale = 1 + (mode === "pucker" ? 1 : -1) * k * PUCKER_RATE;
    out[0] = brush.x + ox * scale;
    out[1] = brush.y + oy * scale;
  }
}

/**
 * Applies one brush step to the field in place, touching only the brush's bounding box.
 * Returns the pixel rectangle that changed, or `null` when the step changes nothing.
 */
export function applyBrush(
  field: LiquifyField,
  mode: LiquifyMode,
  brush: LiquifyBrush,
): Bounds | null {
  const { width: w, height: h, offsets } = field;
  const r = brush.radius;
  const pressure = Math.min(Math.max(brush.pressure, 0), 1);
  if (!(r > 0) || pressure <= 0 || w === 0 || h === 0) return null;
  if (mode === "forward" && !brush.dx && !brush.dy) return null;
  // Node i sits at the pixel centre i + 0.5.
  const left = Math.max(0, Math.ceil(brush.x - r - 0.5));
  const top = Math.max(0, Math.ceil(brush.y - r - 0.5));
  const right = Math.min(w - 1, Math.floor(brush.x + r - 0.5));
  const bottom = Math.min(h - 1, Math.floor(brush.y + r - 0.5));
  if (right < left || bottom < top) return null;

  const bw = right - left + 1;
  const bh = bottom - top + 1;
  // New values go to a scratch buffer so every read below sees the field before this step.
  const next = new Float32Array(bw * bh * 2);
  const changed = new Uint8Array(bw * bh);
  const q = new Float64Array(2);
  const old = new Float64Array(2);
  const r2 = r * r;
  for (let j = 0; j < bh; j++) {
    const py = top + j + 0.5;
    for (let i = 0; i < bw; i++) {
      const px = left + i + 0.5;
      const t2 = ((px - brush.x) ** 2 + (py - brush.y) ** 2) / r2;
      if (t2 >= 1) continue;
      const k = pressure * (1 - t2) * (1 - t2);
      const idx = ((top + j) * w + left + i) * 2;
      const n = (j * bw + i) * 2;
      changed[j * bw + i] = 1;
      if (mode === "reconstruct") {
        const nx = offsets[idx] * (1 - k);
        const ny = offsets[idx + 1] * (1 - k);
        next[n] = Math.abs(nx) < EPSILON ? 0 : nx;
        next[n + 1] = Math.abs(ny) < EPSILON ? 0 : ny;
        continue;
      }
      // Compose: the node now shows whatever the old field showed at q.
      sourcePoint(mode, brush, px, py, k, q);
      sampleField(field, q[0] - 0.5, q[1] - 0.5, old);
      next[n] = q[0] + old[0] - px;
      next[n + 1] = q[1] + old[1] - py;
    }
  }
  for (let j = 0; j < bh; j++) {
    for (let i = 0; i < bw; i++) {
      if (!changed[j * bw + i]) continue;
      const idx = ((top + j) * w + left + i) * 2;
      const n = (j * bw + i) * 2;
      offsets[idx] = next[n];
      offsets[idx + 1] = next[n + 1];
    }
  }
  return { left, top, width: bw, height: bh };
}

/** Adds one premultiplied bilinear tap to `acc`; taps outside the source add nothing. */
function addTap(
  source: Uint8ClampedArray,
  w: number,
  h: number,
  sx: number,
  sy: number,
  weight: number,
  acc: Float64Array,
): void {
  if (weight <= 0 || sx < 0 || sy < 0 || sx >= w || sy >= h) return;
  const s = (sy * w + sx) * 4;
  const alpha = source[s + 3] * weight;
  // Premultiplied, so transparent neighbours do not bleed their colour into the edge.
  acc[0] += source[s] * alpha;
  acc[1] += source[s + 1] * alpha;
  acc[2] += source[s + 2] * alpha;
  acc[3] += alpha;
}

/**
 * Resamples `source` (RGBA, field-sized) through the field with bilinear filtering into `out`,
 * allocated when missing. Only pixels inside `area` are written when it is given. Samples that
 * fall outside the source are transparent.
 */
export function renderLiquify(
  source: Uint8ClampedArray,
  field: LiquifyField,
  out?: Uint8ClampedArray,
  area?: Bounds,
): Uint8ClampedArray {
  const { width: w, height: h, offsets } = field;
  const target = out ?? new Uint8ClampedArray(w * h * 4);
  const x0 = Math.max(0, area?.left ?? 0);
  const y0 = Math.max(0, area?.top ?? 0);
  const x1 = Math.min(w, area ? area.left + area.width : w);
  const y1 = Math.min(h, area ? area.top + area.height : h);
  const acc = new Float64Array(4);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const p = y * w + x;
      const o = p * 4;
      const dx = offsets[p * 2];
      const dy = offsets[p * 2 + 1];
      if (dx === 0 && dy === 0) {
        target[o] = source[o];
        target[o + 1] = source[o + 1];
        target[o + 2] = source[o + 2];
        target[o + 3] = source[o + 3];
        continue;
      }
      const sx = x + dx;
      const sy = y + dy;
      const ix = Math.floor(sx);
      const iy = Math.floor(sy);
      const fx = sx - ix;
      const fy = sy - iy;
      acc.fill(0);
      addTap(source, w, h, ix, iy, (1 - fx) * (1 - fy), acc);
      addTap(source, w, h, ix + 1, iy, fx * (1 - fy), acc);
      addTap(source, w, h, ix, iy + 1, (1 - fx) * fy, acc);
      addTap(source, w, h, ix + 1, iy + 1, fx * fy, acc);
      const alpha = acc[3];
      target[o] = alpha > 0 ? acc[0] / alpha : 0;
      target[o + 1] = alpha > 0 ? acc[1] / alpha : 0;
      target[o + 2] = alpha > 0 ? acc[2] / alpha : 0;
      target[o + 3] = alpha;
    }
  }
  return target;
}

/**
 * A tone curve: a natural cubic spline through a few points, flat outside the
 * first and last, as in Photoshop. Adapted from PhotoCraft's `curve_lut`
 * (MIT OR Apache-2.0, see THIRD_PARTY_NOTICES.md).
 */

import type { Point2D } from "@/lib/image/editor/shapes";

/** The most points a curve may hold, so the shader can loop over a fixed size. */
export const MAX_CURVE_POINTS = 8;

export const IDENTITY_CURVE: readonly Point2D[] = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
];

export interface Spline {
  xs: number[];
  ys: number[];
  /** Second derivatives at each point. */
  m2: number[];
}

/** Sorted, de-duplicated points with the spline's second derivatives (a tridiagonal solve). */
export function curveSpline(points: readonly Point2D[]): Spline {
  const sorted = [...points]
    .sort((a, b) => a.x - b.x)
    .filter((point, i, all) => i === 0 || point.x - all[i - 1].x > 1e-6);
  const xs = sorted.map((point) => point.x);
  const ys = sorted.map((point) => point.y);
  const n = sorted.length;
  const m2 = new Array<number>(n).fill(0);
  const c = new Array<number>(n).fill(0);
  const d = new Array<number>(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    const h0 = xs[i] - xs[i - 1];
    const h1 = xs[i + 1] - xs[i];
    const denom = (h0 + h1) / 3 - (h0 / 6) * c[i - 1];
    const r = (ys[i + 1] - ys[i]) / h1 - (ys[i] - ys[i - 1]) / h0;
    c[i] = h1 / 6 / denom;
    d[i] = (r - (h0 / 6) * d[i - 1]) / denom;
  }
  for (let i = n - 2; i >= 1; i--) m2[i] = d[i] - c[i] * m2[i + 1];
  return { xs, ys, m2 };
}

/** The curve's output for an input, both 0–1. */
export function evaluateSpline({ xs, ys, m2 }: Spline, value: number): number {
  const n = xs.length;
  if (n < 2) return value;
  if (value <= xs[0]) return clamp01(ys[0]);
  if (value >= xs[n - 1]) return clamp01(ys[n - 1]);
  let i = 0;
  while (value > xs[i + 1]) i++;
  const h = xs[i + 1] - xs[i];
  const a = (xs[i + 1] - value) / h;
  const b = (value - xs[i]) / h;
  const y =
    a * ys[i] +
    b * ys[i + 1] +
    (((a ** 3 - a) * m2[i] + (b ** 3 - b) * m2[i + 1]) * h * h) / 6;
  return clamp01(y);
}

/** The curve sampled for every 8-bit value. */
export function curveTable(points: readonly Point2D[]): Uint8ClampedArray {
  const spline = curveSpline(points);
  return Uint8ClampedArray.from({ length: 256 }, (_, i) =>
    Math.round(evaluateSpline(spline, i / 255) * 255),
  );
}

export function isIdentityCurve(points: readonly Point2D[]): boolean {
  return points.every((point) => Math.abs(point.x - point.y) < 1e-6);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

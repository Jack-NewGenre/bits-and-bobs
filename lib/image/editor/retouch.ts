/**
 * Dodge and burn tone curves, adapted from PhotoCraft's `retouch.rs`
 * (MIT OR Apache-2.0, see THIRD_PARTY_NOTICES.md). Each range moves its own
 * part of the tonal scale most, and "protect tones" bends brightness alone so
 * hue and saturation hold.
 */

import { blankCanvas, context2d } from "@/lib/image/editor/raster";

export type ToneRange = "shadows" | "midtones" | "highlights";

/** Perceived brightness of a 0–1 RGB colour. */
export function luma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** The dodge or burn transfer for one 0–1 value at strength 0–1. Black and white stay put for midtones. */
export function toneCurve(
  value: number,
  strength: number,
  range: ToneRange,
  burn: boolean,
): number {
  const v = Math.min(1, Math.max(0, value));
  const e = Math.min(1, Math.max(0, strength));
  if (range === "midtones") {
    const weight = Math.min(1, 4 * v * (1 - v));
    return v + weight * (v ** (burn ? 1 + e : 1 / (1 + e)) - v);
  }
  const weight = range === "shadows" ? (1 - v) ** 2 : v ** 2;
  return burn ? v - e * weight * v : v + e * weight * (1 - v);
}

/** Pulls an out-of-range colour back toward its grey, keeping its brightness, rather than clipping each channel. */
function compressGamut(
  rgb: [number, number, number],
  lum: number,
): [number, number, number] {
  const l = Math.min(1, Math.max(0, lum));
  const lo = Math.min(...rgb);
  const hi = Math.max(...rgb);
  let t = 1;
  if (hi > 1 && hi - l > 1e-9) t = Math.min(t, (1 - l) / (hi - l));
  if (lo < 0 && l - lo > 1e-9) t = Math.min(t, l / (l - lo));
  return [l + (rgb[0] - l) * t, l + (rgb[1] - l) * t, l + (rgb[2] - l) * t];
}

export interface ToneOptions {
  /** 0–1. */
  strength: number;
  range: ToneRange;
  burn: boolean;
  protectTones: boolean;
}

/** Dodges or burns one 0–1 RGB colour. */
export function dodgeBurn(
  rgb: [number, number, number],
  { strength, range, burn, protectTones }: ToneOptions,
): [number, number, number] {
  if (strength <= 0) return rgb;
  if (!protectTones) {
    return [
      toneCurve(rgb[0], strength, range, burn),
      toneCurve(rgb[1], strength, range, burn),
      toneCurve(rgb[2], strength, range, burn),
    ];
  }
  const before = luma(...rgb);
  const after = toneCurve(before, strength, range, burn);
  const scaled: [number, number, number] =
    before > 1e-6
      ? [
          rgb[0] * (after / before),
          rgb[1] * (after / before),
          rgb[2] * (after / before),
        ]
      : [after, after, after];
  return compressGamut(scaled, after);
}

/** Dodges or burns every pixel of an RGBA buffer in place, through a 256-entry table when tones are not protected. */
export function toneImage(data: Uint8ClampedArray, options: ToneOptions): void {
  if (!options.protectTones) {
    const table = Array.from({ length: 256 }, (_, i) =>
      Math.round(
        toneCurve(i / 255, options.strength, options.range, options.burn) * 255,
      ),
    );
    for (let i = 0; i < data.length; i += 4) {
      data[i] = table[data[i]];
      data[i + 1] = table[data[i + 1]];
      data[i + 2] = table[data[i + 2]];
    }
    return;
  }
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = dodgeBurn(
      [data[i] / 255, data[i + 1] / 255, data[i + 2] / 255],
      options,
    );
    data[i] = Math.round(r * 255);
    data[i + 1] = Math.round(g * 255);
    data[i + 2] = Math.round(b * 255);
  }
}

/** A dodged or burned copy of a canvas, for painting through a stroke. */
export function tonedCopy(
  source: HTMLCanvasElement,
  options: ToneOptions,
): HTMLCanvasElement {
  const copy = blankCanvas(source.width, source.height);
  const ctx = context2d(copy);
  ctx.drawImage(source, 0, 0);
  const image = ctx.getImageData(0, 0, copy.width, copy.height);
  toneImage(image.data, options);
  ctx.putImageData(image, 0, 0);
  return copy;
}

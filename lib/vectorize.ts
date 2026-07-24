/**
 * Client-side raster → vector tracing, powered by imagetracerjs. Runs entirely
 * in the browser — no uploads.
 *
 * The raster is drawn to a canvas (downscaled if huge, since tracing cost
 * grows with pixels × colours), quantised into a small palette, traced into
 * coloured SVG paths, then scaled back so the SVG's coordinate space matches
 * the original image.
 */

import type { TraceOptions, TracePaletteColor } from "imagetracerjs";

import { createCanvas2D, nextTick, throwIfAborted } from "@/lib/canvas";
import { clamp } from "@/lib/utils";

export type VectorizeMode = "color" | "grayscale" | "bw";

export interface VectorizeSettings {
  mode: VectorizeMode;
  /** Palette size, 2–64. Ignored in `bw` mode, which is always two-tone. */
  colors: number;
  /** Curve smoothing, 0–100. Higher = smoother paths with fewer nodes. */
  smoothing: number;
  /** Speck removal, 0–100. Higher drops more tiny stray paths. */
  despeckle: number;
}

export interface VectorizePreset {
  id: string;
  label: string;
  settings: VectorizeSettings;
}

export const VECTORIZE_PRESETS: VectorizePreset[] = [
  {
    id: "auto",
    label: "Auto",
    settings: { mode: "color", colors: 16, smoothing: 40, despeckle: 25 },
  },
  {
    id: "detailed",
    label: "Detailed",
    settings: { mode: "color", colors: 32, smoothing: 15, despeckle: 5 },
  },
  {
    id: "poster",
    label: "Poster",
    settings: { mode: "color", colors: 6, smoothing: 55, despeckle: 30 },
  },
  {
    id: "lineart",
    label: "Line art",
    settings: { mode: "bw", colors: 2, smoothing: 45, despeckle: 30 },
  },
];

export const DEFAULT_VECTORIZE_SETTINGS: VectorizeSettings =
  VECTORIZE_PRESETS[0].settings;

export const MIN_COLORS = 2;
export const MAX_COLORS = 64;
/**
 * imagetracerjs's `generatepalette` only builds a genuine grey ramp when
 * `numberofcolors < 8`; at or above that it builds an RGB colour cube
 * instead, so greyscale mode must stay under this cap.
 */
export const GRAYSCALE_MAX_COLORS = 7;

/** Longest traced edge — tracing above this gets very slow for little gain. */
export const MAX_TRACE_DIM = 1024;

const BW_PALETTE: TracePaletteColor[] = [
  { r: 0, g: 0, b: 0, a: 255 },
  { r: 255, g: 255, b: 255, a: 255 },
];

/** Round to 4 decimals to keep option values and SVG coordinates tidy. */
function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

/** Map 0–100 smoothing to imagetracer's line/curve error tolerance. */
export function smoothingToTolerance(smoothing: number): number {
  return round4(0.1 + (clamp(smoothing, 0, 100) / 100) * 2.4);
}

/** Map 0–100 despeckle to `pathomit` — paths shorter than this are dropped. */
export function despeckleToPathOmit(despeckle: number): number {
  return Math.round((clamp(despeckle, 0, 100) / 100) * 32);
}

/**
 * Size to trace at, clamped so the longest edge never exceeds `maxDim`, plus
 * the uniform factor that scales traced coordinates back to the original size.
 */
export function computeTraceSize(
  width: number,
  height: number,
  maxDim: number = MAX_TRACE_DIM,
): { width: number; height: number; scale: number } {
  const longest = Math.max(width, height);
  if (longest <= maxDim) return { width, height, scale: 1 };
  const k = maxDim / longest;
  const w = Math.max(1, Math.round(width * k));
  const h = Math.max(1, Math.round(height * k));
  return { width: w, height: h, scale: round4(width / w) };
}

/** Build the imagetracerjs option object for the chosen settings. */
export function buildTraceOptions(
  settings: VectorizeSettings,
  scale: number = 1,
): TraceOptions {
  const tolerance = smoothingToTolerance(settings.smoothing);
  const base: TraceOptions = {
    ltres: tolerance,
    qtres: tolerance,
    pathomit: despeckleToPathOmit(settings.despeckle),
    rightangleenhance: true,
    numberofcolors: clamp(Math.round(settings.colors), MIN_COLORS, MAX_COLORS),
    strokewidth: 1,
    roundcoords: 1,
    viewbox: true,
    scale,
  };

  if (settings.mode === "grayscale") {
    return {
      ...base,
      numberofcolors: clamp(
        Math.round(settings.colors),
        MIN_COLORS,
        GRAYSCALE_MAX_COLORS,
      ),
      colorsampling: 0,
      colorquantcycles: 1,
    };
  }
  if (settings.mode === "bw") {
    return {
      ...base,
      numberofcolors: 2,
      colorquantcycles: 1,
      // Fresh copies: imagetracer averages palette entries in place.
      pal: BW_PALETTE.map((color) => ({ ...color })),
    };
  }
  return base;
}

/** Count the `<path>` elements in an SVG string. */
export function countSvgPaths(svg: string): number {
  return svg.match(/<path/g)?.length ?? 0;
}

export function svgToBlob(svg: string): Blob {
  return new Blob([svg], { type: "image/svg+xml" });
}

export type VectorizeStage = "preparing" | "tracing" | "done";

export interface VectorizeProgress {
  stage: VectorizeStage;
  /** 0–1 overall progress. */
  fraction: number;
}

export interface VectorizeOptions {
  onProgress?: (progress: VectorizeProgress) => void;
  signal?: AbortSignal;
}

export interface VectorizeResult {
  /** The generated SVG markup. */
  svg: string;
  /** The same markup as an `image/svg+xml` blob, for preview and download. */
  blob: Blob;
}

/**
 * Trace an image into an SVG vector.
 * Throws `DOMException` (name "AbortError") if aborted.
 */
export async function vectorizeImage(
  source: Blob,
  settings: VectorizeSettings,
  { onProgress, signal }: VectorizeOptions = {},
): Promise<VectorizeResult> {
  throwIfAborted(signal);
  onProgress?.({ stage: "preparing", fraction: 0 });

  const bitmap = await createImageBitmap(source);
  throwIfAborted(signal);

  const { width, height, scale } = computeTraceSize(
    bitmap.width,
    bitmap.height,
  );

  const { ctx } = createCanvas2D(width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const imageData = ctx.getImageData(0, 0, width, height);

  onProgress?.({ stage: "tracing", fraction: 0.4 });
  // Yield once so the UI can paint the busy state before the heavy pass.
  await nextTick();
  throwIfAborted(signal);

  const { default: ImageTracer } = await import("imagetracerjs");
  const svg = ImageTracer.imagedataToSVG(
    imageData,
    buildTraceOptions(settings, scale),
  );
  throwIfAborted(signal);

  onProgress?.({ stage: "done", fraction: 1 });
  return { svg, blob: svgToBlob(svg) };
}

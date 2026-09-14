/**
 * Client-side raster → vector tracing. Runs entirely in the browser, with no
 * uploads.
 *
 * Two engines, chosen by mode:
 *   - Colour and greyscale go through imagetracerjs, which quantises the
 *     raster into a small palette and traces each colour into its own paths.
 *   - Black & white goes through Potrace, the long-standing standard for
 *     bichrome tracing. Its curve fitting is markedly better than a palette
 *     tracer's on line art: smoother outlines from far fewer nodes.
 *
 * Either way the raster is drawn to a canvas first (downscaled if huge, since
 * tracing cost grows with pixels × colours) and the traced coordinates are
 * scaled back so the SVG matches the original image's dimensions.
 */

import type { TraceOptions, TracePaletteColor } from "imagetracerjs";

import { createCanvas2D, nextTick, throwIfAborted } from "@/lib/image/canvas";
import { readImageHeader } from "@/lib/image/dimensions";
import { withSuffix } from "@/lib/download";
import { optimizeSvg } from "@/lib/image/svg-optimize";
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

/** Longest traced edge. Tracing above this gets very slow for little gain. */
export const MAX_TRACE_DIM = 1024;

const BW_PALETTE: TracePaletteColor[] = [
  { r: 0, g: 0, b: 0, a: 255 },
  { r: 255, g: 255, b: 255, a: 255 },
];

/** Round to 4 decimals to keep option values and SVG coordinates tidy. */
export function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

/** Map 0–100 smoothing to imagetracer's line/curve error tolerance. */
export function smoothingToTolerance(smoothing: number): number {
  return round4(0.1 + (clamp(smoothing, 0, 100) / 100) * 2.4);
}

/** Map 0-100 despeckle to `pathomit`, so paths shorter than this are dropped. */
export function despeckleToPathOmit(despeckle: number): number {
  return Math.round((clamp(despeckle, 0, 100) / 100) * 32);
}

/** Map 0-100 despeckle to Potrace's `turdsize`, so speckles below this go. */
export function despeckleToTurdSize(despeckle: number): number {
  return Math.round((clamp(despeckle, 0, 100) / 100) * 20);
}

/**
 * Map 0–100 smoothing to Potrace's `alphamax`, which decides how readily a
 * corner becomes a curve. Its useful range tops out at 1.34.
 */
export function smoothingToAlphaMax(smoothing: number): number {
  return round4((clamp(smoothing, 0, 100) / 100) * 1.34);
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

/**
 * Count the `<path>` elements in an SVG string. A traced photo runs to
 * megabytes with thousands of paths, so this walks the string rather than
 * collecting every match into an array only to read its length.
 */
export function countSvgPaths(svg: string): number {
  let count = 0;
  let at = svg.indexOf("<path");
  while (at !== -1) {
    count += 1;
    at = svg.indexOf("<path", at + 5);
  }
  return count;
}

/** Filename for a traced result. */
export function svgFileName(name: string): string {
  return withSuffix(name, "", "svg");
}

export function svgToBlob(svg: string): Blob {
  return new Blob([svg], { type: "image/svg+xml" });
}

export type VectorizeStage =
  | "preparing"
  | "tracing"
  | "optimizing"
  | "done";

export interface VectorizeProgress {
  stage: VectorizeStage;
  /** 0–1 overall progress. */
  fraction: number;
}

export interface VectorizeOptions {
  onProgress?: (progress: VectorizeProgress) => void;
  signal?: AbortSignal;
  /**
   * Cap the longest traced edge below `MAX_TRACE_DIM`. Used for the live
   * preview, where a coarser trace is enough to judge the settings by.
   */
  maxTraceDim?: number;
}

export interface VectorizeResult {
  /** The generated SVG markup. */
  svg: string;
  /** The same markup as an `image/svg+xml` blob, for preview and download. */
  blob: Blob;
  /** Bytes the raw trace occupied before optimisation, for reporting. */
  rawBytes: number;
}

/**
 * Trace an image into an SVG vector.
 * Throws `DOMException` (name "AbortError") if aborted.
 */
export async function vectorizeImage(
  source: Blob,
  settings: VectorizeSettings,
  { onProgress, signal, maxTraceDim }: VectorizeOptions = {},
): Promise<VectorizeResult> {
  throwIfAborted(signal);
  onProgress?.({ stage: "preparing", fraction: 0 });

  const cap = Math.min(MAX_TRACE_DIM, maxTraceDim ?? MAX_TRACE_DIM);

  // Tracing works on a scaled-down copy, and the live preview shrinks it
  // further still. Reading the size from the header first lets the decoder
  // produce the small copy directly, instead of unpacking every pixel of a
  // 6000px photo only to throw almost all of them away on the next line.
  const header = await readImageHeader(source);

  // A header says how big the image is, never which way up it is: a JPEG
  // carrying an EXIF rotation decodes with its width and height the other way
  // round to the frame the header describes. Which edge is longest can swap,
  // but their lengths cannot, so the decode is hinted with one edge only.
  // That leaves the decoder to keep the real aspect ratio whichever way the
  // image comes out, and pinning both to a transposed guess would squash it
  // before we ever saw it.
  const edges = header
    ? {
        shortest: Math.min(header.sourceWidth, header.sourceHeight),
        longest: Math.max(header.sourceWidth, header.sourceHeight),
      }
    : undefined;

  const bitmap =
    edges && edges.longest > cap
      ? await createImageBitmap(source, {
          resizeWidth: Math.min(cap, edges.shortest),
          resizeQuality: "high",
        })
      : await createImageBitmap(source);
  throwIfAborted(signal);

  // Trust the decoded bitmap over the header, so a header that lied cannot
  // put the canvas and the image out of step.
  const { width, height } = computeTraceSize(bitmap.width, bitmap.height, cap);

  // Traced coordinates are scaled back up to the size the user gave us, so
  // this is measured against the source rather than the decoded copy, which
  // the hint above may already have shrunk.
  const sourceLongest = edges?.longest ?? Math.max(bitmap.width, bitmap.height);
  const scale = round4(sourceLongest / Math.max(width, height));

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

  const { traceImageTracer, tracePotrace } = await import(
    "@/lib/image/trace-engines"
  );
  const traced =
    settings.mode === "bw"
      ? await tracePotrace(imageData, settings, scale)
      : await traceImageTracer(imageData, settings, scale);
  throwIfAborted(signal);

  onProgress?.({ stage: "optimizing", fraction: 0.85 });
  const svg = optimizeSvg(traced);
  throwIfAborted(signal);

  onProgress?.({ stage: "done", fraction: 1 });
  return { svg, blob: svgToBlob(svg), rawBytes: traced.length };
}

/**
 * Client-side image enhancement, running entirely on a <canvas>, no uploads.
 *
 * Low-quality images are improved with a classic, dependency-free pipeline:
 *   1. High-quality upscaling (bilinear/bicubic via the browser's resampler)
 *   2. Tone adjustments (brightness / contrast / saturation) applied natively
 *      through `ctx.filter` in a single draw
 *   3. An edge-preserving median denoise
 *   4. An unsharp mask to restore crisp edges
 *
 * Everything below the orchestrator is a small pure function so the maths can
 * be unit-tested without a real canvas.
 */

import {
  canvasToBlob,
  createCanvas2D,
  nextTick,
  throwIfAborted,
} from "@/lib/image/canvas";
import { medianDenoise } from "@/lib/image/denoise";
import { outputTypeFor, type OutputFormat } from "@/lib/image/image-output";
import { extensionForType, withSuffix } from "@/lib/download";
import { clamp } from "@/lib/utils";
import { unsharpMask } from "@/lib/image/unsharp";

export type EnhanceScale = 1 | 2 | 4;

/**
 * `fast` resamples on a canvas: instant, but it can only interpolate between
 * pixels that already exist. `ai` reconstructs detail with a super-resolution
 * model: far better on small, soft images, at the cost of a one-off model
 * download and a much slower pass.
 */
export type EnhanceEngine = "fast" | "ai";


export interface EnhanceSettings {
  /** Which upscaler produces the enlargement. */
  engine: EnhanceEngine;
  /** Encoding of the downloaded file. */
  format: OutputFormat;
  /** Encoder quality for the lossy formats, 1–100. Ignored by PNG. */
  quality: number;
  /** Output size multiplier. */
  scale: EnhanceScale;
  /** Edge sharpening strength, 0–100. */
  sharpen: number;
  /** Noise-reduction (pre-blur) strength, 0–100. */
  denoise: number;
  /** Brightness adjustment, -100–100. */
  brightness: number;
  /** Contrast adjustment, -100–100. */
  contrast: number;
  /** Saturation adjustment, -100–100. */
  saturation: number;
}

/** Filename for an enhanced blob, keeping whichever format it encoded to. */
export function enhancedFileName(name: string, blob: Blob): string {
  return withSuffix(name, "-enhanced", extensionForType(blob.type));
}

/** Longest output edge, to keep memory and processing time bounded. */
export const MAX_OUTPUT_DIM = 4096;

export type EnhanceStage =
  | "preparing"
  | "denoising"
  | "enhancing"
  | "encoding"
  | "done";

export interface EnhanceProgress {
  stage: EnhanceStage;
  /** 0–1 overall progress. */
  fraction: number;
}

export interface EnhanceOptions {
  onProgress?: (progress: EnhanceProgress) => void;
  signal?: AbortSignal;
  /**
   * Cap the longest output edge below `MAX_OUTPUT_DIM`. Used for the live
   * preview, which only has to look right on screen.
   */
  maxOutputDim?: number;
  /**
   * Resample by this factor instead of `settings.scale`. The AI engine has
   * already enlarged the source by a fixed amount, so the canvas pass only
   * covers whatever enlargement is left over.
   */
  scaleOverride?: number;
}

export interface EnhanceResult {
  /** Encoded output, ready to preview or download. */
  blob: Blob;
  /** Actual output size in pixels, after the clamp. */
  width: number;
  height: number;
  /** Size a full-quality pass would produce, for honest UI labelling. */
  fullWidth: number;
  fullHeight: number;
}

/** Round to 3 decimals to keep filter strings tidy. */
function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Target dimensions after scaling, clamped so the longest edge never exceeds
 * `maxDim`. Always at least 1x1.
 */
export function computeTargetSize(
  width: number,
  height: number,
  scale: number,
  maxDim: number = MAX_OUTPUT_DIM,
): { width: number; height: number } {
  let w = Math.max(1, Math.round(width * scale));
  let h = Math.max(1, Math.round(height * scale));
  const longest = Math.max(w, h);
  if (longest > maxDim) {
    const k = maxDim / longest;
    w = Math.max(1, Math.round(w * k));
    h = Math.max(1, Math.round(h * k));
  }
  return { width: w, height: h };
}

/** Build the CSS `ctx.filter` string for the tone adjustments, or "none". */
export function buildFilter(settings: EnhanceSettings): string {
  const parts: string[] = [];
  const brightness = 1 + clamp(settings.brightness, -100, 100) / 100;
  const contrast = 1 + clamp(settings.contrast, -100, 100) / 100;
  const saturation = 1 + clamp(settings.saturation, -100, 100) / 100;

  if (brightness !== 1) parts.push(`brightness(${round(brightness)})`);
  if (contrast !== 1) parts.push(`contrast(${round(contrast)})`);
  if (saturation !== 1) parts.push(`saturate(${round(saturation)})`);

  return parts.length > 0 ? parts.join(" ") : "none";
}

/** Sharpen gain at amount = 1 (the slider's 0–100 maps to a 0–1 amount). */
const SHARPEN_GAIN = 1.8;

/** Unsharp blur radius, scaled to the upscale factor so it stays visible. */
function sharpenRadius(scale: number): number {
  return 0.8 + scale * 0.8;
}

/**
 * Enhance an image and return the encoded result with its true output size.
 * Throws `DOMException` (name "AbortError") if aborted.
 */
export async function enhanceImage(
  source: Blob,
  settings: EnhanceSettings,
  {
    onProgress,
    signal,
    maxOutputDim,
    scaleOverride,
  }: EnhanceOptions = {},
): Promise<EnhanceResult> {
  throwIfAborted(signal);
  onProgress?.({ stage: "preparing", fraction: 0 });

  const bitmap = await createImageBitmap(source);
  throwIfAborted(signal);

  const scale = scaleOverride ?? settings.scale;
  const full = computeTargetSize(bitmap.width, bitmap.height, scale);
  const { width, height } = computeTargetSize(
    bitmap.width,
    bitmap.height,
    scale,
    Math.min(MAX_OUTPUT_DIM, maxOutputDim ?? MAX_OUTPUT_DIM),
  );

  const { canvas, ctx } = createCanvas2D(width, height);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.filter = buildFilter(settings);
  ctx.drawImage(bitmap, 0, 0, width, height);
  ctx.filter = "none";
  bitmap.close?.();

  const denoise = clamp(settings.denoise, 0, 100) / 100;
  if (denoise > 0) {
    onProgress?.({ stage: "denoising", fraction: 0.35 });
    // Yield once so the UI can paint the busy state before the heavy pass.
    await nextTick();
    throwIfAborted(signal);

    const image = ctx.getImageData(0, 0, width, height);
    image.data.set(medianDenoise(image.data, width, height, denoise));
    ctx.putImageData(image, 0, 0);
  }

  onProgress?.({ stage: "enhancing", fraction: 0.6 });

  const amount = clamp(settings.sharpen, 0, 100) / 100;
  if (amount > 0) {
    // Yield once so the UI can paint the busy state before the heavy pass.
    await nextTick();
    throwIfAborted(signal);

    // Unsharp mask: blur a copy at a scale-aware radius, then amplify the
    // difference between the sharp and blurred versions. The radius grows with
    // the upscale factor so the effect stays visible after enlarging.
    const blur = createCanvas2D(width, height);
    blur.ctx.filter = `blur(${sharpenRadius(scale)}px)`;
    blur.ctx.drawImage(canvas, 0, 0);

    const baseImage = ctx.getImageData(0, 0, width, height);
    const blurImage = blur.ctx.getImageData(0, 0, width, height);
    unsharpMask(baseImage.data, blurImage.data, amount * SHARPEN_GAIN);
    ctx.putImageData(baseImage, 0, 0);
  }

  onProgress?.({ stage: "encoding", fraction: 0.9 });

  const { type, quality } = outputTypeFor(
    source.type,
    settings.format,
    settings.quality,
  );
  const blob = await canvasToBlob(canvas, type, quality);
  throwIfAborted(signal);

  onProgress?.({ stage: "done", fraction: 1 });
  return {
    blob,
    width,
    height,
    fullWidth: full.width,
    fullHeight: full.height,
  };
}

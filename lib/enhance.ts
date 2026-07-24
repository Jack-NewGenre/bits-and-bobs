/**
 * Client-side image enhancement — runs entirely on a <canvas>, no uploads.
 *
 * Low-quality images are improved with a classic, dependency-free pipeline:
 *   1. High-quality upscaling (bilinear/bicubic via the browser's resampler)
 *   2. Tone adjustments (brightness / contrast / saturation) + optional denoise
 *      blur, applied natively through `ctx.filter` in a single draw
 *   3. An unsharp 3x3 convolution to restore crisp edges
 *
 * Everything below the orchestrator is a small pure function so the maths can
 * be unit-tested without a real canvas.
 */

import {
  canvasToBlob,
  createCanvas2D,
  nextTick,
  throwIfAborted,
} from "@/lib/canvas";
import { clamp } from "@/lib/utils";
import { unsharpMask } from "@/lib/unsharp";

export type EnhanceScale = 1 | 2 | 4;

export interface EnhanceSettings {
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

export interface EnhancePreset {
  id: string;
  label: string;
  settings: EnhanceSettings;
}

export const ENHANCE_PRESETS: EnhancePreset[] = [
  {
    id: "auto",
    label: "Auto",
    settings: {
      scale: 2,
      sharpen: 35,
      denoise: 18,
      brightness: 2,
      contrast: 8,
      saturation: 6,
    },
  },
  {
    id: "sharpen",
    label: "Sharpen",
    settings: {
      scale: 2,
      sharpen: 65,
      denoise: 0,
      brightness: 0,
      contrast: 6,
      saturation: 0,
    },
  },
  {
    id: "denoise",
    label: "Denoise",
    settings: {
      scale: 2,
      sharpen: 18,
      denoise: 55,
      brightness: 0,
      contrast: 4,
      saturation: 0,
    },
  },
  {
    id: "vivid",
    label: "Vivid",
    settings: {
      scale: 2,
      sharpen: 28,
      denoise: 10,
      brightness: 4,
      contrast: 14,
      saturation: 28,
    },
  },
];

export const DEFAULT_ENHANCE_SETTINGS: EnhanceSettings = ENHANCE_PRESETS[0]
  .settings;

/** Longest output edge, to keep memory and processing time bounded. */
export const MAX_OUTPUT_DIM = 4096;

export type EnhanceStage = "preparing" | "enhancing" | "encoding" | "done";

export interface EnhanceProgress {
  stage: EnhanceStage;
  /** 0–1 overall progress. */
  fraction: number;
}

export interface EnhanceOptions {
  onProgress?: (progress: EnhanceProgress) => void;
  signal?: AbortSignal;
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

/** Build the CSS `ctx.filter` string for tone + denoise, or "none". */
export function buildFilter(settings: EnhanceSettings): string {
  const parts: string[] = [];
  const brightness = 1 + clamp(settings.brightness, -100, 100) / 100;
  const contrast = 1 + clamp(settings.contrast, -100, 100) / 100;
  const saturation = 1 + clamp(settings.saturation, -100, 100) / 100;

  if (brightness !== 1) parts.push(`brightness(${round(brightness)})`);
  if (contrast !== 1) parts.push(`contrast(${round(contrast)})`);
  if (saturation !== 1) parts.push(`saturate(${round(saturation)})`);

  const blurPx = (clamp(settings.denoise, 0, 100) / 100) * 1.1;
  if (blurPx > 0) parts.push(`blur(${round(blurPx)}px)`);

  return parts.length > 0 ? parts.join(" ") : "none";
}

/** Choose an output encoding, preferring to keep the source format. */
export function outputTypeFor(inputType?: string): {
  type: string;
  quality?: number;
} {
  if (inputType === "image/jpeg") return { type: "image/jpeg", quality: 0.92 };
  if (inputType === "image/webp") return { type: "image/webp", quality: 0.92 };
  return { type: "image/png" };
}

/** Sharpen gain at amount = 1 (the slider's 0–100 maps to a 0–1 amount). */
const SHARPEN_GAIN = 1.8;

/** Unsharp blur radius, scaled to the upscale factor so it stays visible. */
function sharpenRadius(scale: number): number {
  return 0.8 + scale * 0.8;
}

/**
 * Enhance an image and return the result as a Blob.
 * Throws `DOMException` (name "AbortError") if aborted.
 */
export async function enhanceImage(
  source: Blob,
  settings: EnhanceSettings,
  { onProgress, signal }: EnhanceOptions = {},
): Promise<Blob> {
  throwIfAborted(signal);
  onProgress?.({ stage: "preparing", fraction: 0 });

  const bitmap = await createImageBitmap(source);
  throwIfAborted(signal);

  const { width, height } = computeTargetSize(
    bitmap.width,
    bitmap.height,
    settings.scale,
  );

  const { canvas, ctx } = createCanvas2D(width, height);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.filter = buildFilter(settings);
  ctx.drawImage(bitmap, 0, 0, width, height);
  ctx.filter = "none";
  bitmap.close?.();

  onProgress?.({ stage: "enhancing", fraction: 0.5 });

  const amount = clamp(settings.sharpen, 0, 100) / 100;
  if (amount > 0) {
    // Yield once so the UI can paint the busy state before the heavy pass.
    await nextTick();
    throwIfAborted(signal);

    // Unsharp mask: blur a copy at a scale-aware radius, then amplify the
    // difference between the sharp and blurred versions. The radius grows with
    // the upscale factor so the effect stays visible after enlarging.
    const blur = createCanvas2D(width, height);
    blur.ctx.filter = `blur(${sharpenRadius(settings.scale)}px)`;
    blur.ctx.drawImage(canvas, 0, 0);

    const baseImage = ctx.getImageData(0, 0, width, height);
    const blurImage = blur.ctx.getImageData(0, 0, width, height);
    const sharpened = unsharpMask(
      baseImage.data,
      blurImage.data,
      amount * SHARPEN_GAIN,
    );
    baseImage.data.set(sharpened);
    ctx.putImageData(baseImage, 0, 0);
  }

  onProgress?.({ stage: "encoding", fraction: 0.9 });

  const { type, quality } = outputTypeFor(source.type);
  const blob = await canvasToBlob(canvas, type, quality);
  throwIfAborted(signal);

  onProgress?.({ stage: "done", fraction: 1 });
  return blob;
}

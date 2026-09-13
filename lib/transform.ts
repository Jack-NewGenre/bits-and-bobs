/**
 * The one pipeline behind converting, compressing and resizing.
 *
 * All three are the same three steps (decode, draw at some size, encode in
 * some format) with a different part of the settings exposed in each tool's
 * UI. Keeping them one function means a JPEG matte or a fit mode behaves
 * identically wherever you meet it.
 */

import {
  canvasToBlob,
  createCanvas2D,
  nextTick,
  throwIfAborted,
} from "@/lib/canvas";
import { needsMatte, outputTypeFor, type OutputFormat } from "@/lib/image-output";
import { applyPalette, quantise, collectPixels } from "@/lib/quantise";
import { clamp } from "@/lib/utils";

/** How the source is fitted into the requested box. */
export type FitMode = "contain" | "cover" | "stretch";

export interface TransformSettings {
  /** Target box. Either may be left blank to follow the other. */
  width?: number;
  height?: number;
  /** Percentage of the original size, used when no box is given. */
  scale: number;
  fit: FitMode;
  format: OutputFormat;
  /** Encoder quality for the lossy formats, 1–100. */
  quality: number;
  /**
   * Reduce to at most this many colours before encoding. 0 leaves the image
   * untouched. Shrinks a PNG substantially, since its compression rewards
   * having fewer distinct values to store.
   */
  colours: number;
  /** Shown behind transparency when the target format has no alpha. */
  matte: string;
}

export const DEFAULT_TRANSFORM_SETTINGS: TransformSettings = {
  scale: 100,
  fit: "contain",
  format: "source",
  quality: 82,
  colours: 0,
  matte: "#ffffff",
};

/** Longest output edge, to keep memory and processing time bounded. */
export const MAX_OUTPUT_DIM = 8192;

export interface TransformResult {
  blob: Blob;
  sourceWidth: number;
  sourceHeight: number;
  width: number;
  height: number;
  sourceBytes: number;
}

export interface TransformOptions {
  onProgress?: (progress: { fraction: number }) => void;
  signal?: AbortSignal;
}

/**
 * Work out the output box. An explicit width or height wins; supply only one
 * and the other follows the aspect ratio; supply neither and the scale
 * percentage applies.
 */
export function computeBox(
  sourceWidth: number,
  sourceHeight: number,
  settings: Pick<TransformSettings, "width" | "height" | "scale">,
  maxDim = MAX_OUTPUT_DIM,
): { width: number; height: number } {
  const ratio = sourceWidth / sourceHeight;
  const { width, height } = settings;

  let target: { width: number; height: number };
  if (width && height) target = { width, height };
  else if (width) target = { width, height: width / ratio };
  else if (height) target = { width: height * ratio, height };
  else {
    const factor = clamp(settings.scale, 1, 1000) / 100;
    target = { width: sourceWidth * factor, height: sourceHeight * factor };
  }

  let outWidth = Math.max(1, Math.round(target.width));
  let outHeight = Math.max(1, Math.round(target.height));

  const longest = Math.max(outWidth, outHeight);
  if (longest > maxDim) {
    const shrink = maxDim / longest;
    outWidth = Math.max(1, Math.round(outWidth * shrink));
    outHeight = Math.max(1, Math.round(outHeight * shrink));
  }

  return { width: outWidth, height: outHeight };
}

export interface DrawRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Where to draw the source inside the output box.
 *
 * `contain` fits the whole image in and leaves gaps; `cover` fills the box
 * and lets the overflow be cropped, centred; `stretch` distorts to fit.
 */
export function computeDrawRect(
  sourceWidth: number,
  sourceHeight: number,
  boxWidth: number,
  boxHeight: number,
  fit: FitMode,
): DrawRect {
  if (fit === "stretch") {
    return { x: 0, y: 0, width: boxWidth, height: boxHeight };
  }

  const scaleX = boxWidth / sourceWidth;
  const scaleY = boxHeight / sourceHeight;
  const factor = fit === "cover" ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);

  const width = sourceWidth * factor;
  const height = sourceHeight * factor;
  return {
    x: (boxWidth - width) / 2,
    y: (boxHeight - height) / 2,
    width,
    height,
  };
}

/**
 * Resize, recolour and re-encode an image.
 * Throws `DOMException` (name "AbortError") if aborted.
 */
export async function transformImage(
  source: Blob,
  settings: TransformSettings,
  { onProgress, signal }: TransformOptions = {},
): Promise<TransformResult> {
  throwIfAborted(signal);
  onProgress?.({ fraction: 0 });

  const bitmap = await createImageBitmap(source);
  throwIfAborted(signal);

  const sourceWidth = bitmap.width;
  const sourceHeight = bitmap.height;
  const { width, height } = computeBox(sourceWidth, sourceHeight, settings);

  const { canvas, ctx } = createCanvas2D(width, height);

  // A format with no alpha would render transparency as black, so the matte
  // goes down first and the image is drawn over it.
  if (needsMatte(settings.format, source.type)) {
    ctx.fillStyle = settings.matte;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const rect = computeDrawRect(sourceWidth, sourceHeight, width, height, settings.fit);
  ctx.drawImage(bitmap, rect.x, rect.y, rect.width, rect.height);
  bitmap.close?.();

  onProgress?.({ fraction: 0.5 });

  if (settings.colours > 0) {
    // Yield once so the UI can paint the busy state before the heavy pass.
    await nextTick();
    throwIfAborted(signal);

    const image = ctx.getImageData(0, 0, width, height);
    // Sample rather than read every pixel: a palette drawn from a fraction of
    // a large image is indistinguishable from one drawn from all of it.
    const step = Math.max(1, Math.floor((width * height) / 40_000));
    const palette = quantise(
      collectPixels(image.data, step),
      settings.colours,
    ).map((entry) => entry.colour);

    applyPalette(image.data, palette);
    ctx.putImageData(image, 0, 0);
  }

  onProgress?.({ fraction: 0.85 });

  const { type, quality } = outputTypeFor(
    source.type,
    settings.format,
    settings.quality,
  );
  const blob = await canvasToBlob(canvas, type, quality);
  throwIfAborted(signal);

  onProgress?.({ fraction: 1 });
  return {
    blob,
    sourceWidth,
    sourceHeight,
    width,
    height,
    sourceBytes: source.size,
  };
}

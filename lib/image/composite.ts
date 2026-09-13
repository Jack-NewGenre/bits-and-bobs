/**
 * Canvas compositing helpers for the background remover.
 *
 * Takes a transparent cutout and renders it onto a chosen background
 * (transparent, a solid colour, or an uploaded image), returning a PNG blob.
 */

import { canvasToBlob, createCanvas2D, loadImage } from "@/lib/image/canvas";
import { trimImage } from "@/lib/image/trim";
import { clamp } from "@/lib/utils";

export type BackgroundMode = "transparent" | "color" | "image";

export interface BackgroundSettings {
  mode: BackgroundMode;
  color: string;
  /** Edge softening, 0–100. Hides the hard fringe a hard mask leaves behind. */
  feather: number;
  /** Crop away the empty margin around the subject. */
  trim: boolean;
  /** Object URL of a user-supplied background image. */
  imageUrl?: string;
}

export const DEFAULT_BACKGROUND_SETTINGS: BackgroundSettings = {
  mode: "transparent",
  color: "#ffffff",
  feather: 0,
  trim: false,
};

/**
 * Blur radius for a feather amount, scaled to the image so the softening
 * looks the same on a thumbnail and on a 4000px photo.
 */
export function featherRadius(feather: number, longestEdge: number): number {
  const amount = clamp(feather, 0, 100) / 100;
  return amount * Math.max(1, longestEdge / 250);
}

/**
 * Soften a cutout's edge by blurring only its alpha channel, leaving the
 * colours crisp. A segmentation mask ends abruptly at the subject's outline,
 * which reads as a cut-out-with-scissors fringe once a new background sits
 * behind it; a feathered alpha lets the edge fade instead.
 */
export async function featherCutout(
  cutout: Blob,
  feather: number,
): Promise<Blob> {
  const bitmap = await createImageBitmap(cutout);
  const { width, height } = bitmap;
  const radius = featherRadius(feather, Math.max(width, height));
  if (radius <= 0) {
    bitmap.close();
    return cutout;
  }

  const sharp = createCanvas2D(width, height);
  sharp.ctx.drawImage(bitmap, 0, 0);

  const soft = createCanvas2D(width, height);
  soft.ctx.filter = `blur(${Math.round(radius * 100) / 100}px)`;
  soft.ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const sharpImage = sharp.ctx.getImageData(0, 0, width, height);
  const softImage = soft.ctx.getImageData(0, 0, width, height);
  // Keep every colour channel, take only the softened alpha.
  for (let i = 3; i < sharpImage.data.length; i += 4) {
    sharpImage.data[i] = softImage.data[i];
  }
  sharp.ctx.putImageData(sharpImage, 0, 0);

  return canvasToBlob(sharp.canvas, "image/png");
}

export interface CompositeOptions {
  mode: BackgroundMode;
  /** CSS colour, used when mode === "color". */
  color?: string;
  /** Background bitmap, used when mode === "image". */
  background?: ImageBitmap | HTMLImageElement | HTMLCanvasElement;
}

async function blobToBitmap(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob);
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to export canvas to PNG"));
    }, "image/png");
  });
}

/**
 * Composite the cutout over the requested background and return a PNG blob.
 * Transparent mode needs no drawing at all, so the cutout is handed straight
 * back rather than paying for a redundant decode/re-encode round trip.
 */
export async function compositeCutout(
  cutout: Blob,
  options: CompositeOptions,
): Promise<Blob> {
  if (options.mode === "transparent") return cutout;

  const foreground = await blobToBitmap(cutout);
  const { width, height } = foreground;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  if (options.mode === "color" && options.color) {
    ctx.fillStyle = options.color;
    ctx.fillRect(0, 0, width, height);
  } else if (options.mode === "image" && options.background) {
    drawCover(ctx, options.background, width, height);
  }

  ctx.drawImage(foreground, 0, 0, width, height);
  foreground.close();

  return canvasToPngBlob(canvas);
}

/** Draw a source so it covers the target box, preserving aspect ratio. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  source: ImageBitmap | HTMLImageElement | HTMLCanvasElement,
  width: number,
  height: number,
): void {
  const sourceWidth = "width" in source ? source.width : width;
  const sourceHeight = "height" in source ? source.height : height;
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const offsetX = (width - drawWidth) / 2;
  const offsetY = (height - drawHeight) / 2;
  ctx.drawImage(source, offsetX, offsetY, drawWidth, drawHeight);
}

/**
 * Composite a cutout onto the background described by `settings`, loading the
 * user's background image first when one is in play. Shared by the live
 * preview and the "download all" flow so a zip always matches what is on
 * screen.
 */
export async function compositeWithSettings(
  cutout: Blob,
  settings: BackgroundSettings,
): Promise<{ blob: Blob }> {
  const feathered = await featherCutout(cutout, settings.feather);
  // Trim after feathering, so the softened edge is inside the crop rather
  // than sliced off by it.
  const cropped = settings.trim
    ? (await trimImage(feathered)).blob
    : feathered;

  const background =
    settings.mode === "image" && settings.imageUrl
      ? await loadImage(settings.imageUrl)
      : undefined;

  const blob = await compositeCutout(cropped, {
    mode: settings.mode,
    color: settings.color,
    background,
  });
  return { blob };
}

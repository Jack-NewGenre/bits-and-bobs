/**
 * Canvas compositing for the background remover.
 *
 * Takes a transparent cutout and renders it onto a chosen background
 * (transparent, a solid colour, or an uploaded image), optionally softening
 * its edge and cropping away the empty margin, and returns a PNG blob.
 *
 * Feather, trim and background are deliberately one pass rather than three
 * chained helpers. Handing a blob from one stage to the next would mean
 * encoding a PNG and immediately decoding it again at every join, which on a
 * large photo costs more than all the pixel work put together.
 */

import { canvasToBlob, createCanvas2D } from "@/lib/image/canvas";
import { findContentBounds, type TrimBounds } from "@/lib/image/trim";
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
 * The background image, decoded once. The slider re-composites continuously
 * while it is dragged, and the picture behind the subject does not change
 * between ticks, so decoding it every time is pure repetition.
 */
let cachedBackground: { url: string; image: ImageBitmap } | undefined;

/**
 * Fetched and decoded rather than loaded through an `Image` element, because
 * this runs in the worker as well, where there is no DOM. An object URL is
 * readable from a worker on the same origin.
 */
async function backgroundFor(
  settings: BackgroundSettings,
): Promise<ImageBitmap | undefined> {
  const { imageUrl } = settings;
  if (settings.mode !== "image" || !imageUrl) return undefined;
  if (cachedBackground?.url === imageUrl) return cachedBackground.image;

  const response = await fetch(imageUrl);
  const image = await createImageBitmap(await response.blob());
  cachedBackground?.image.close();
  cachedBackground = { url: imageUrl, image };
  return image;
}

/** Draw a source so it covers the target box, preserving aspect ratio. */
function drawCover(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  source: CanvasImageSource & { width: number; height: number },
  width: number,
  height: number,
): void {
  const scale = Math.max(width / source.width, height / source.height);
  const drawWidth = source.width * scale;
  const drawHeight = source.height * scale;
  ctx.drawImage(
    source,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

/**
 * Blur only the alpha channel, leaving the colours crisp. A segmentation mask
 * ends abruptly at the subject's outline, which reads as a cut-out-with-
 * scissors fringe once a new background sits behind it; a feathered alpha lets
 * the edge fade instead. Returns the pixels it wrote, so a following trim can
 * read the bounds without going back to the canvas for them.
 */
function featherInPlace(
  layer: ReturnType<typeof createCanvas2D>,
  source: ImageBitmap,
  radius: number,
): ImageData {
  const { width, height } = source;

  const soft = createCanvas2D(width, height);
  soft.ctx.filter = `blur(${Math.round(radius * 100) / 100}px)`;
  soft.ctx.drawImage(source, 0, 0);

  const sharpImage = layer.ctx.getImageData(0, 0, width, height);
  const softImage = soft.ctx.getImageData(0, 0, width, height);
  // Keep every colour channel, take only the softened alpha.
  for (let i = 3; i < sharpImage.data.length; i += 4) {
    sharpImage.data[i] = softImage.data[i];
  }
  layer.ctx.putImageData(sharpImage, 0, 0);
  return sharpImage;
}

/**
 * Composite a cutout onto the background described by `settings`. Shared by
 * the live preview and the "download all" flow so a zip always matches what
 * is on screen.
 */
export async function compositeWithSettings(
  cutout: Blob,
  settings: BackgroundSettings,
): Promise<{ blob: Blob }> {
  // An untouched transparent cutout is already exactly the wanted output, so
  // it never reaches a canvas at all.
  const wantsBackground = settings.mode !== "transparent";
  if (!wantsBackground && !settings.trim && settings.feather <= 0) {
    return { blob: cutout };
  }

  const bitmap = await createImageBitmap(cutout);
  const { width, height } = bitmap;
  const radius = featherRadius(settings.feather, Math.max(width, height));

  // The foreground is the bitmap itself unless feathering has rewritten it,
  // in which case it is the canvas holding the softened alpha.
  let foreground: CanvasImageSource = bitmap;
  let pixels: ImageData | undefined;

  if (radius > 0 || settings.trim) {
    const layer = createCanvas2D(width, height);
    layer.ctx.drawImage(bitmap, 0, 0);
    pixels =
      radius > 0
        ? featherInPlace(layer, bitmap, radius)
        : layer.ctx.getImageData(0, 0, width, height);
    foreground = layer.canvas;
  }

  let bounds: TrimBounds | undefined;
  if (settings.trim && pixels) {
    bounds = findContentBounds(pixels.data, width, height);
  }
  const crop: TrimBounds = bounds ?? {
    left: 0,
    top: 0,
    right: width,
    bottom: height,
    width,
    height,
  };

  const background = await backgroundFor(settings);
  const out = createCanvas2D(crop.width, crop.height);

  if (settings.mode === "color") {
    out.ctx.fillStyle = settings.color;
    out.ctx.fillRect(0, 0, crop.width, crop.height);
  } else if (background) {
    drawCover(out.ctx, background, crop.width, crop.height);
  }

  out.ctx.drawImage(
    foreground,
    crop.left,
    crop.top,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  );
  bitmap.close();

  return { blob: await canvasToBlob(out.canvas, "image/png") };
}

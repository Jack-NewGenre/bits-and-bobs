/** Turning a cut-out image into a die-cut sticker: a border, then a shadow. */

import {
  canvasToBlob,
  createCanvas2D,
  throwIfAborted,
} from "@/lib/image/canvas";
import { squaredDistances } from "@/lib/image/distance";
import type { Rgb } from "@/lib/colour/colour";

export interface StickerSettings {
  /** Border thickness as a percentage of the artwork's longest edge. */
  border: number;
  borderColour: Rgb;
  shadow: boolean;
  /** Draw from the cut-out, or from the whole original picture. */
  removeBackground: boolean;
}

export interface StickerSource {
  image: CanvasImageSource;
  width: number;
  height: number;
}

export interface StickerLayout {
  width: number;
  height: number;
  /** Where the artwork sits, and its drawn size. */
  inset: number;
  artWidth: number;
  artHeight: number;
  /** Border thickness in output pixels. */
  radius: number;
  shadowBlur: number;
  shadowOffset: number;
}

export const MAX_BORDER = 10;
/** Keeps the distance transform quick enough to redraw as a slider moves. */
export const MAX_EDGE = 1536;
const OPAQUE = 128;
const SHADOW_COLOUR = "rgba(0, 0, 0, 0.35)";

export const DEFAULT_STICKER_SETTINGS: StickerSettings = {
  border: 4,
  borderColour: { r: 255, g: 255, b: 255, a: 1 },
  shadow: true,
  removeBackground: true,
};

/** The image a sticker is drawn from: the cut-out, or the original if it is kept whole. */
export function stickerArtwork(
  original: Blob,
  cutout: Blob,
  { removeBackground }: Pick<StickerSettings, "removeBackground">,
): Blob {
  return removeBackground ? cutout : original;
}

/** The canvas size and margins for a sticker, leaving room for border and shadow. */
export function stickerLayout(
  width: number,
  height: number,
  { border, shadow }: Pick<StickerSettings, "border" | "shadow">,
): StickerLayout {
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const artWidth = Math.max(1, Math.round(width * scale));
  const artHeight = Math.max(1, Math.round(height * scale));
  const longest = Math.max(artWidth, artHeight);
  const radius = Math.round((border / 100) * longest);
  const shadowBlur = shadow ? Math.max(2, Math.round(longest * 0.02)) : 0;
  const shadowOffset = shadow ? Math.max(1, Math.round(longest * 0.01)) : 0;
  const inset = radius + shadowBlur * 2 + shadowOffset + 1;
  return {
    width: artWidth + inset * 2,
    height: artHeight + inset * 2,
    inset,
    artWidth,
    artHeight,
    radius,
    shadowBlur,
    shadowOffset,
  };
}

/** Make solid every pixel that cannot reach the edge without crossing solid ones. */
function fillHoles(
  mask: Uint8ClampedArray,
  width: number,
  height: number,
): void {
  const outside = new Uint8Array(mask.length);
  const stack: number[] = [];
  const visit = (index: number) => {
    if (mask[index] < 255 && !outside[index]) {
      outside[index] = 1;
      stack.push(index);
    }
  };

  for (let x = 0; x < width; x++) {
    visit(x);
    visit((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    visit(y * width);
    visit(y * width + width - 1);
  }

  while (stack.length) {
    const index = stack.pop()!;
    const x = index % width;
    if (x > 0) visit(index - 1);
    if (x < width - 1) visit(index + 1);
    if (index >= width) visit(index - width);
    if (index < mask.length - width) visit(index + width);
  }

  for (let i = 0; i < mask.length; i++) if (!outside[i]) mask[i] = 255;
}

/**
 * The sticker's silhouette, one alpha value per pixel: the artwork grown by
 * `radius` pixels with a smooth, anti-aliased edge and its holes filled in.
 * A radius of zero leaves the artwork's own alpha untouched.
 */
export function stickerMask(
  alpha: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
): Uint8ClampedArray {
  if (radius <= 0) return alpha.slice();

  const distances = squaredDistances((i) => alpha[i] >= OPAQUE, width, height);
  const mask = new Uint8ClampedArray(alpha.length);
  for (let i = 0; i < mask.length; i++) {
    const coverage = Math.min(
      1,
      Math.max(0, radius + 0.5 - Math.sqrt(distances[i])),
    );
    mask[i] = Math.max(alpha[i], Math.round(coverage * 255));
  }
  fillHoles(mask, width, height);
  return mask;
}

/** Every fourth byte of RGBA pixels: the alpha channel on its own. */
export function alphaChannel(rgba: Uint8ClampedArray): Uint8ClampedArray {
  const alpha = new Uint8ClampedArray(rgba.length / 4);
  for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3];
  return alpha;
}

/** Whether an image already has a clear background, so there is nothing to remove. */
export function hasTransparency(alpha: Uint8ClampedArray): boolean {
  return alpha.some((value) => value < OPAQUE);
}

/** Decode an image and check it for transparent pixels. */
export async function isTransparentImage(blob: Blob): Promise<boolean> {
  const bitmap = await createImageBitmap(blob);
  const { width, height } = bitmap;
  const { ctx } = createCanvas2D(width, height);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return hasTransparency(
    alphaChannel(ctx.getImageData(0, 0, width, height).data),
  );
}

/** Paint a silhouette in one colour, writing RGBA pixels into `target`. */
export function paintMask(
  mask: Uint8ClampedArray,
  { r, g, b, a }: Rgb,
  target: Uint8ClampedArray,
) {
  for (let i = 0; i < mask.length; i++) {
    const at = i * 4;
    target[at] = r;
    target[at + 1] = g;
    target[at + 2] = b;
    target[at + 3] = Math.round(mask[i] * a);
  }
}

/** Draw the sticker: shadow, then the bordered silhouette, then the artwork on top. */
export async function renderSticker(
  { image, width, height }: StickerSource,
  settings: StickerSettings,
): Promise<Blob> {
  const layout = stickerLayout(width, height, settings);
  const { inset, artWidth, artHeight } = layout;

  const art = createCanvas2D(layout.width, layout.height);
  art.ctx.imageSmoothingQuality = "high";
  art.ctx.drawImage(image, inset, inset, artWidth, artHeight);
  const pixels = art.ctx.getImageData(0, 0, layout.width, layout.height);

  const backing = createCanvas2D(layout.width, layout.height);
  const silhouette = backing.ctx.createImageData(layout.width, layout.height);
  const mask = stickerMask(
    alphaChannel(pixels.data),
    layout.width,
    layout.height,
    layout.radius,
  );
  paintMask(mask, settings.borderColour, silhouette.data);
  backing.ctx.putImageData(silhouette, 0, 0);

  const out = createCanvas2D(layout.width, layout.height);
  if (settings.shadow) {
    out.ctx.shadowColor = SHADOW_COLOUR;
    out.ctx.shadowBlur = layout.shadowBlur;
    out.ctx.shadowOffsetY = layout.shadowOffset;
  }
  out.ctx.drawImage(backing.canvas, 0, 0);
  out.ctx.shadowColor = "transparent";
  out.ctx.drawImage(art.canvas, 0, 0);

  return canvasToBlob(out.canvas, "image/png");
}

/** Decode a cut-out and draw it as a sticker. */
export async function stickerFromBlob(
  blob: Blob,
  settings: StickerSettings,
  signal?: AbortSignal,
): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  try {
    throwIfAborted(signal);
    return await renderSticker(
      { image: bitmap, width: bitmap.width, height: bitmap.height },
      settings,
    );
  } finally {
    bitmap.close();
  }
}

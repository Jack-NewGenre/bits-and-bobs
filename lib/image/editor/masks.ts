/**
 * Layer masks and clipping masks, as in Photoshop.
 *
 * A layer mask is a grid the size of the layer whose alpha shows (opaque) or
 * hides (clear) the layer, so hidden pixels are never lost. A clipped layer
 * only shows where the nearest unclipped layer beneath it has pixels.
 *
 * Both become a Fabric clip path, rebuilt from the layer's tags (`maskSrc`,
 * `clipped`) whenever the picture changes, and left out of saved snapshots so
 * an undo step only holds the mask's URL.
 */

import { FabricImage, type Canvas, type FabricObject } from "fabric";

import { canvasToBlob, loadImage } from "@/lib/image/canvas";
import type { Bounds } from "@/lib/image/editor/document";
import {
  blankCanvas,
  context2d,
  paintLayer,
  rasterise,
  type PaintDraw,
  type PaintOptions,
} from "@/lib/image/editor/raster";

type MaskSource = HTMLCanvasElement | HTMLImageElement;

/** Mask pixels by URL, so a layer rebuilt by undo finds its mask straight away. */
const byUrl = new Map<string, MaskSource>();
/** The newest mask of a live layer, before its URL is ready. */
const live = new WeakMap<FabricObject, MaskSource>();

export function getMask(object: FabricObject): MaskSource | undefined {
  return (
    live.get(object) ?? (object.maskSrc ? byUrl.get(object.maskSrc) : undefined)
  );
}

/** Loads the masks of layers rebuilt from a snapshot or a file. */
export async function loadMasks(
  objects: readonly FabricObject[],
): Promise<void> {
  await Promise.all(
    objects.map(async (object) => {
      const url = object.maskSrc;
      if (!url || byUrl.has(url)) return;
      byUrl.set(url, await loadImage(url));
    }),
  );
}

/** Gives a layer a new mask; resolves once its URL is stored on the layer. */
export async function setMask(
  object: FabricObject,
  mask: HTMLCanvasElement,
): Promise<void> {
  live.set(object, mask);
  const url = URL.createObjectURL(await canvasToBlob(mask, "image/png"));
  byUrl.set(url, mask);
  if (live.get(object) === mask) object.set({ maskSrc: url });
}

export function removeMask(object: FabricObject): void {
  live.delete(object);
  object.set({ maskSrc: undefined });
}

/** A mask that shows all of a layer of the given size. */
export function revealAll(width: number, height: number): HTMLCanvasElement {
  const mask = blankCanvas(width, height);
  const ctx = context2d(mask);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, mask.width, mask.height);
  return mask;
}

/** A mask showing only the selection, drawn into the layer's own pixel space. */
export function maskFromSelection(
  object: FabricObject,
  selection: HTMLCanvasElement,
): HTMLCanvasElement {
  const mask = blankCanvas(object.width, object.height);
  const ctx = context2d(mask);
  const [a, b, c, d, e, f] = object.calcTransformMatrix();
  // Scene to layer pixels: undo the layer's transform, then move the origin to its corner.
  ctx.translate(object.width / 2, object.height / 2);
  const det = a * d - b * c;
  ctx.transform(
    d / det,
    -b / det,
    -c / det,
    a / det,
    (c * f - d * e) / det,
    (b * e - a * f) / det,
  );
  ctx.drawImage(selection, 0, 0);
  return mask;
}

/**
 * Grows a mask with its layer. The new margin is shown, as Photoshop shows
 * the parts of a layer painted past a mask's edge.
 */
export function growMask(
  mask: CanvasImageSource,
  width: number,
  height: number,
  area: Bounds,
): HTMLCanvasElement {
  const grown = revealAll(area.width, area.height);
  const ctx = context2d(grown);
  ctx.clearRect(-area.left, -area.top, width, height);
  ctx.drawImage(mask, -area.left, -area.top);
  return grown;
}

const CLIP = {
  excludeFromExport: true,
  originX: "center",
  originY: "center",
} as const;

/** A layer's own mask as a clip path. */
function maskClip(mask: MaskSource): FabricImage {
  return new FabricImage(mask, { ...CLIP, left: 0, top: 0 });
}

/**
 * The pixel layer to paint on: an image as it is, anything else rasterised
 * first with its mask baked in.
 */
export function pixelLayerFor(
  canvas: Canvas,
  object: FabricObject,
): { layer: FabricImage; rasterised: boolean } {
  if (object instanceof FabricImage) return { layer: object, rasterised: false };
  const mask = getMask(object);
  return {
    layer: rasterise(canvas, object, mask && maskClip(mask)),
    rasterised: true,
  };
}

/**
 * Paints into a layer, growing its mask with it so the mask stays over the
 * same pixels and the new margin is shown.
 */
export function paintMaskedLayer(
  layer: FabricImage,
  draw: PaintDraw,
  options?: PaintOptions,
): Bounds {
  const { width, height } = layer;
  const oldMask = getMask(layer);
  const area = paintLayer(layer, draw, options);
  if (oldMask && (area.width !== width || area.height !== height)) {
    void setMask(layer, growMask(oldMask, width, height, area));
  }
  return area;
}

/** The base's pixels in scene space, cut down by the layer's own mask if it has one. */
function clippingClip(
  object: FabricObject,
  base: FabricObject,
  mask?: CanvasImageSource,
): FabricImage {
  const pixels = base.toCanvasElement({ multiplier: 1, withoutShadow: true });
  const centre = base.getCenterPoint();
  if (mask) {
    const ctx = context2d(pixels);
    ctx.globalCompositeOperation = "destination-in";
    ctx.translate(pixels.width / 2 - centre.x, pixels.height / 2 - centre.y);
    ctx.transform(...object.calcTransformMatrix());
    ctx.drawImage(mask, -object.width / 2, -object.height / 2);
  }
  return new FabricImage(pixels, {
    ...CLIP,
    absolutePositioned: true,
    left: centre.x,
    top: centre.y,
  });
}

/** Rebuilds every layer's clip path from its mask and clipping tags, bottom layer first. */
export function syncClipPaths(canvas: Canvas): void {
  let base: FabricObject | undefined;
  for (const object of canvas.getObjects()) {
    const mask = getMask(object);
    const clipBase = object.clipped ? base : undefined;
    if (!object.clipped) base = object;
    const clipPath = clipBase
      ? clippingClip(object, clipBase, mask)
      : mask
        ? maskClip(mask)
        : undefined;
    if (!clipPath && !object.clipPath) continue;
    object.set({ clipPath, dirty: true });
  }
}

/** A black and white preview of a mask: white shows, black hides. */
export function renderMaskThumbnail(
  mask: CanvasImageSource,
  width: number,
  height: number,
  size: number,
): string {
  const scale = size / Math.max(width, height, 1);
  const thumb = blankCanvas(width * scale, height * scale);
  const ctx = context2d(thumb);
  ctx.drawImage(mask, 0, 0, thumb.width, thumb.height);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, thumb.width, thumb.height);
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, thumb.width, thumb.height);
  return thumb.toDataURL("image/png");
}

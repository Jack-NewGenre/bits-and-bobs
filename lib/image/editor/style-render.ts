/**
 * Draws layer styles live on image layers, without touching their pixels. The
 * styles are rasterised once per pixel or style change, then each render puts
 * the shadow, glow and outer stroke behind the finished layer (after its mask)
 * and the inner stroke over it, inside a cache padded to fit them.
 */

import { FabricImage } from "fabric";

import {
  hasStyles,
  renderLayerStyles,
  withStyleDefaults,
  type SavedLayerStyles,
} from "@/lib/image/editor/layer-styles";
import { blankCanvas, readPixels } from "@/lib/image/editor/raster";

interface StyleCache {
  element: CanvasImageSource;
  key: string;
  padding: number;
  behind: HTMLCanvasElement | null;
  front: HTMLCanvasElement | null;
}

const CACHE = new WeakMap<FabricImage, StyleCache>();

function toCanvas(
  pixels: Uint8ClampedArray | null,
  width: number,
  height: number,
) {
  if (!pixels) return null;
  const canvas = blankCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const image = ctx?.createImageData(width, height);
  if (!ctx || !image) return canvas;
  image.data.set(pixels);
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/** True when the layer has at least one style switched on. */
export function isStyled(saved: SavedLayerStyles | undefined): boolean {
  return Boolean(saved) && hasStyles(withStyleDefaults(saved));
}

function stylesFor(image: FabricImage): StyleCache | null {
  if (!isStyled(image.layerStyles)) return null;
  const element = image._originalElement;
  const key = JSON.stringify(image.layerStyles);
  const cached = CACHE.get(image);
  if (cached && cached.element === element && cached.key === key) return cached;
  const { width, height } = image;
  const pixels = readPixels(element, width, height).data;
  const rasters = renderLayerStyles(
    pixels,
    width,
    height,
    withStyleDefaults(image.layerStyles),
  );
  const entry = {
    element,
    key,
    padding: rasters.padding,
    behind: toCanvas(rasters.behind, rasters.width, rasters.height),
    front: toCanvas(rasters.front, rasters.width, rasters.height),
  };
  CACHE.set(image, entry);
  return entry;
}

/** How far a layer's styles reach past its edges, in its own pixels. */
export function styleReach(image: FabricImage): number {
  return isStyled(image.layerStyles) ? (stylesFor(image)?.padding ?? 0) : 0;
}

const proto = FabricImage.prototype;
const { drawObject, needsItsOwnCache, _getCacheCanvasDimensions, setElement } =
  proto;

// Fabric does not mark the cache dirty on new pixels, so a cached (styled) layer would keep
// drawing its old ones after a paint, fill or Liquify.
proto.setElement = function (
  this: FabricImage,
  ...args: Parameters<FabricImage["setElement"]>
) {
  setElement.apply(this, args);
  this.dirty = true;
};

proto.needsItsOwnCache = function (this: FabricImage) {
  return isStyled(this.layerStyles) || needsItsOwnCache.call(this);
};

proto._getCacheCanvasDimensions = function (this: FabricImage) {
  const dims = _getCacheCanvasDimensions.call(this);
  const grow = 2 * styleReach(this);
  if (!grow) return dims;
  const [growX, growY] = [grow * dims.zoomX, grow * dims.zoomY];
  return {
    ...dims,
    width: Math.ceil(dims.width + growX),
    height: Math.ceil(dims.height + growY),
    x: dims.x + growX,
    y: dims.y + growY,
  };
};

proto.drawObject = function (
  this: FabricImage,
  ...args: Parameters<FabricImage["drawObject"]>
) {
  drawObject.apply(this, args);
  const [ctx, forClipping] = args;
  const styles = !forClipping && stylesFor(this);
  if (!styles) return;
  const [x, y] = [
    -this.width / 2 - styles.padding,
    -this.height / 2 - styles.padding,
  ];
  ctx.save();
  if (styles.front) ctx.drawImage(styles.front, x, y);
  if (styles.behind) {
    ctx.globalCompositeOperation = "destination-over";
    ctx.drawImage(styles.behind, x, y);
  }
  ctx.restore();
};

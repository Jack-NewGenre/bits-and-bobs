/**
 * Painting on a layer's pixels, the way Photoshop does. A finished brush or
 * eraser stroke, a fill or a gradient is drawn into the layer's own image
 * instead of being kept as a separate object, so a photo can be painted on
 * and erased directly. Shapes and text are rasterised (turned into pixels)
 * the first time they are painted.
 */

import {
  FabricImage,
  Point,
  util,
  type Canvas,
  type FabricObject,
  type TMat2D,
} from "fabric";

import { canvasToBlob, loadImage } from "@/lib/image/canvas";
import { MAX_DIMENSION, type Bounds } from "@/lib/image/editor/document";

/**
 * The part of the layer's pixel grid a stroke needs, given the layer's
 * transform, its size and the stroke's box in the scene. The grid grows to
 * take in a stroke that reaches past its edge (negative `left` or `top` means
 * it grew up or left), but never beyond the largest size a layer may have.
 */
export function paintArea(
  matrix: TMat2D,
  width: number,
  height: number,
  reach: Bounds,
): Bounds {
  const toLocal = util.invertTransform(matrix);
  const right = reach.left + reach.width;
  const bottom = reach.top + reach.height;
  const corners = [
    [reach.left, reach.top],
    [right, reach.top],
    [reach.left, bottom],
    [right, bottom],
  ].map(([x, y]) => util.transformPoint(new Point(x, y), toLocal));
  const xs = corners.map((point) => point.x + width / 2);
  const ys = corners.map((point) => point.y + height / 2);
  const area = {
    left: Math.floor(Math.min(0, ...xs)),
    top: Math.floor(Math.min(0, ...ys)),
    right: Math.ceil(Math.max(width, ...xs)),
    bottom: Math.ceil(Math.max(height, ...ys)),
  };
  const grown = {
    left: area.left,
    top: area.top,
    width: area.right - area.left,
    height: area.bottom - area.top,
  };
  const tooBig = grown.width > MAX_DIMENSION || grown.height > MAX_DIMENSION;
  return tooBig ? { left: 0, top: 0, width, height } : grown;
}

/** The transform from scene coordinates onto the layer's (possibly grown) pixel grid. */
export function sceneToPixels(
  matrix: TMat2D,
  width: number,
  height: number,
  area: Bounds,
): TMat2D {
  const shift: TMat2D = [
    1,
    0,
    0,
    1,
    width / 2 - area.left,
    height / 2 - area.top,
  ];
  return util.multiplyTransformMatrices(shift, util.invertTransform(matrix));
}

/** Where the layer's centre must sit once it covers `area`, so its old pixels stay put. */
export function centreAfterGrowth(
  matrix: TMat2D,
  width: number,
  height: number,
  area: Bounds,
): Point {
  const offset = new Point(
    area.left + area.width / 2 - width / 2,
    area.top + area.height / 2 - height / 2,
  );
  return util.transformPoint(offset, matrix);
}

export function blankCanvas(width: number, height: number): HTMLCanvasElement {
  return Object.assign(document.createElement("canvas"), {
    width: Math.max(1, Math.ceil(width)),
    height: Math.max(1, Math.ceil(height)),
  });
}

export function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d", { willReadFrequently: false });
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  return ctx;
}

/** An empty, transparent pixel layer covering `area` of the scene. */
export function createPixelLayer(area: Bounds): FabricImage {
  const layer = new FabricImage(blankCanvas(area.width, area.height));
  layer.setPositionByOrigin(new Point(area.left, area.top), "left", "top");
  layer.setCoords();
  return layer;
}

/**
 * Turns a shape or text layer into a pixel layer in the same place in the
 * stack, keeping its name, opacity, blend mode and clipping. A layer mask is
 * baked into the pixels, since the new grid no longer lines up with it. A
 * clipped layer's clip path holds the clipping, not the mask, so its mask is
 * passed in as `maskClip` and drawn in its place.
 * Opacity, blend and clipping are set aside while it is drawn so they are
 * not baked in as well.
 */
export function rasterise(
  canvas: Canvas,
  object: FabricObject,
  maskClip?: FabricObject,
): FabricImage {
  const {
    opacity,
    globalCompositeOperation,
    layerId,
    layerName,
    clipped,
    clipPath,
  } = object;
  object.set({
    opacity: 1,
    globalCompositeOperation: "source-over",
    ...(clipped && { clipPath: maskClip }),
  });
  const layer = new FabricImage(object.toCanvasElement({ multiplier: 1 }), {
    opacity,
    globalCompositeOperation,
    layerId,
    layerName,
    layerKind: "image",
    locked: false,
    clipped,
  });
  object.set({ clipPath });
  layer.setPositionByOrigin(object.getCenterPoint(), "center", "center");
  layer.setCoords();
  const index = canvas.getObjects().indexOf(object);
  canvas.remove(object);
  canvas.insertAt(index, layer);
  return layer;
}

/** A grid of pixels and where it sits in the scene. */
export interface PixelTarget {
  element: CanvasImageSource;
  matrix: TMat2D;
  width: number;
  height: number;
}

/**
 * Draws the paint. `ctx` maps scene coordinates onto the grid; `base` holds
 * the grid's pixels before painting, unscaled, for tools that copy them
 * (clone, dodge and burn).
 */
export type PaintDraw = (
  ctx: CanvasRenderingContext2D,
  base: HTMLCanvasElement,
  toPixels: TMat2D,
) => void;

export interface PaintOptions {
  /** The part of the scene the paint may grow the grid to cover. */
  reach?: Bounds | null;
  /** Cut the paint out of the pixels instead of adding it. */
  erase?: boolean;
  /** A document-sized canvas whose alpha limits where paint lands: the selection. */
  clip?: HTMLCanvasElement | null;
  /** Paint that goes underneath the existing pixels, showing only where they are see-through. */
  behind?: PaintDraw;
}

/** Paints onto a copy of a pixel grid, returning the new pixels and the area they cover. */
export function paintPixels(
  target: PixelTarget,
  draw: PaintDraw,
  options: PaintOptions = {},
) {
  const { matrix, width, height } = target;
  const area = options.reach
    ? paintArea(matrix, width, height, options.reach)
    : { left: 0, top: 0, width, height };
  const toPixels = sceneToPixels(matrix, width, height, area);

  const pixels = blankCanvas(area.width, area.height);
  const ctx = context2d(pixels);
  ctx.drawImage(target.element, -area.left, -area.top);

  const render = (paintDraw: PaintDraw) => {
    const paint = blankCanvas(area.width, area.height);
    const paintCtx = context2d(paint);
    paintCtx.setTransform(...toPixels);
    paintDraw(paintCtx, pixels, toPixels);
    if (options.clip) {
      paintCtx.setTransform(...toPixels);
      paintCtx.globalCompositeOperation = "destination-in";
      paintCtx.drawImage(options.clip, 0, 0);
    }
    return paint;
  };

  const paint = render(draw);
  ctx.globalCompositeOperation = options.erase
    ? "destination-out"
    : "source-over";
  ctx.drawImage(paint, 0, 0);
  if (options.behind) {
    ctx.globalCompositeOperation = "destination-over";
    ctx.drawImage(render(options.behind), 0, 0);
  }
  return { pixels, area };
}

/**
 * Paints into a layer's original pixels, so adjustments still sit on top and
 * can be undone, growing the layer if the paint reaches past it. Returns the
 * area painted, in the layer's old pixel coordinates.
 */
export function paintLayer(
  layer: FabricImage,
  draw: PaintDraw,
  options: PaintOptions = {},
): Bounds {
  const matrix = layer.calcTransformMatrix();
  const { width, height } = layer;
  const { pixels, area } = paintPixels(
    { element: layer._originalElement, matrix, width, height },
    draw,
    options,
  );
  layer.setElement(pixels);
  layer.setPositionByOrigin(
    centreAfterGrowth(matrix, width, height, area),
    "center",
    "center",
  );
  layer.setCoords();
  return area;
}

/** Draws a Fabric object (a brush stroke, a shape) in scene coordinates. */
export function drawObject(object: FabricObject): PaintDraw {
  return (ctx) => {
    object.set({ objectCaching: false });
    object.render(ctx);
  };
}

/**
 * Uses a stroke as a stencil: wherever it covers, `fill` is drawn instead
 * (on the grid's own unscaled pixels), keeping the stroke's softness and
 * opacity. This is how clone, dodge and burn put their pixels down.
 */
export function throughStroke(
  stroke: FabricObject,
  fill: (
    ctx: CanvasRenderingContext2D,
    base: HTMLCanvasElement,
    toPixels: TMat2D,
  ) => void,
): PaintDraw {
  return (ctx, base, toPixels) => {
    drawObject(stroke)(ctx, base, toPixels);
    ctx.save();
    ctx.globalCompositeOperation = "source-in";
    // The brush's softness blurs the stencil's edge, never the pixels put through it.
    ctx.filter = "none";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    fill(ctx, base, toPixels);
    ctx.restore();
  };
}

/** Swaps freshly painted pixels for a PNG behind a blob URL, so undo snapshots stay small. */
async function settle(
  painted: CanvasImageSource,
): Promise<HTMLImageElement | null> {
  if (!(painted instanceof HTMLCanvasElement)) return null;
  const blob = await canvasToBlob(painted, "image/png");
  return loadImage(URL.createObjectURL(blob));
}

/**
 * Swaps a layer's freshly painted pixels for a blob-backed image, so each
 * undo step holds a short URL rather than a data URL of the whole layer.
 * Skipped if the layer was painted again while the PNG was being made.
 */
export async function settlePixels(layer: FabricImage): Promise<void> {
  const painted = layer._originalElement;
  const image = await settle(painted);
  if (image && layer._originalElement === painted) layer.setElement(image);
}

/** A grid's pixels, read back for the fill bucket and the magic wand. */
export function readPixels(
  element: CanvasImageSource,
  width: number,
  height: number,
): ImageData {
  const canvas = blankCanvas(width, height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(element, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/** A canvas holding the given pixels. */
export function pixelsToCanvas(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = blankCanvas(width, height);
  context2d(canvas).putImageData(
    new ImageData(new Uint8ClampedArray(data), width, height),
    0,
    0,
  );
  return canvas;
}

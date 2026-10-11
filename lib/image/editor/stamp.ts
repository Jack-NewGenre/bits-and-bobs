/** The clone stamp and healing brush: both copy the picture from a picked source into a stroke. */

import type { FabricObject, TMat2D } from "fabric";

import { healPixels } from "@/lib/image/editor/poisson";
import {
  blankCanvas,
  context2d,
  pixelsToCanvas,
  readPixels,
  throughStroke,
  type PaintDraw,
} from "@/lib/image/editor/raster";
import type { Point2D } from "@/lib/image/editor/shapes";

/** Draws `source` on the paint grid, shifted by `offset` so the picked point lands under the stroke. */
function drawShifted(
  ctx: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  offset: Point2D,
  toPixels: TMat2D,
): void {
  ctx.setTransform(...toPixels);
  ctx.drawImage(source, offset.x, offset.y);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/** Copies the picture into the stroke from `offset` back, where the source was picked. */
export function cloneStroke(
  stroke: FabricObject,
  source: HTMLCanvasElement,
  offset: Point2D,
): PaintDraw {
  return throughStroke(stroke, (ctx, _base, toPixels) =>
    drawShifted(ctx, source, offset, toPixels),
  );
}

/**
 * Copies the picture like the clone stamp, then relights it with a Poisson
 * blend so it takes on the colour and shading round the stroke. `under` is
 * what shows beneath the layer (the whole document when sampling all layers),
 * so healing an empty layer still matches what the user sees.
 */
export function healStroke(
  stroke: FabricObject,
  source: HTMLCanvasElement,
  offset: Point2D,
  under: HTMLCanvasElement | null,
): PaintDraw {
  return throughStroke(stroke, (ctx, base, toPixels) => {
    const { width, height } = ctx.canvas;
    const covered = ctx.getImageData(0, 0, width, height).data;
    const mask = new Uint8Array(width * height);
    for (let i = 0; i < mask.length; i++)
      mask[i] = covered[i * 4 + 3] > 0 ? 255 : 0;

    const seen = blankCanvas(width, height);
    const seenCtx = context2d(seen);
    if (under) drawShifted(seenCtx, under, { x: 0, y: 0 }, toPixels);
    seenCtx.drawImage(base, 0, 0);

    const copy = blankCanvas(width, height);
    drawShifted(context2d(copy), source, offset, toPixels);

    const healed = healPixels({
      target: readPixels(seen, width, height).data,
      source: readPixels(copy, width, height).data,
      mask,
      width,
      height,
    });
    ctx.drawImage(pixelsToCanvas(healed, width, height), 0, 0);
  });
}

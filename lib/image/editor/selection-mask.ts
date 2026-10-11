/**
 * Pixel selections in the browser: drawing a marquee or lasso into a
 * document-sized mask, and turning a mask back into a canvas that paint can
 * be clipped to. The mask maths itself lives in `pixels.ts`.
 */

import type { Point2D } from "@/lib/image/editor/shapes";
import type { MarqueeShape } from "@/lib/image/editor/tool-style";
import { blankCanvas, context2d } from "@/lib/image/editor/raster";

export interface Selection {
  mask: Uint8Array;
  width: number;
  height: number;
}

/** Fewer points than this is a click, not a lasso. */
export const MIN_LASSO_POINTS = 3;

function drawnMask(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): Uint8Array {
  const canvas = blankCanvas(width, height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.fillStyle = "#000";
  ctx.beginPath();
  draw(ctx);
  ctx.fill();
  const { data } = ctx.getImageData(0, 0, width, height);
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i += 1) mask[i] = data[i * 4 + 3];
  return mask;
}

/** A rectangular or elliptical marquee from one corner to the other. */
export function marqueeMask(
  width: number,
  height: number,
  shape: MarqueeShape,
  from: Point2D,
  to: Point2D,
): Uint8Array {
  const left = Math.min(from.x, to.x);
  const top = Math.min(from.y, to.y);
  const w = Math.abs(to.x - from.x);
  const h = Math.abs(to.y - from.y);
  return drawnMask(width, height, (ctx) => {
    if (shape === "ellipse")
      ctx.ellipse(left + w / 2, top + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    else
      ctx.rect(Math.round(left), Math.round(top), Math.round(w), Math.round(h));
  });
}

/** A freehand lasso, closed back to where it started. */
export function lassoMask(
  width: number,
  height: number,
  points: readonly Point2D[],
): Uint8Array {
  return drawnMask(width, height, (ctx) => {
    points.forEach((point, index) =>
      index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y),
    );
    ctx.closePath();
  });
}

/** The selection as a canvas whose alpha is the mask, for clipping paint with `destination-in`. */
export function selectionCanvas(selection: Selection): HTMLCanvasElement {
  const { mask, width, height } = selection;
  const canvas = blankCanvas(width, height);
  const ctx = context2d(canvas);
  const image = ctx.createImageData(width, height);
  for (let i = 0; i < mask.length; i += 1) image.data[i * 4 + 3] = mask[i];
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/** True when nothing is selected at all. */
export function isEmptyMask(mask: Uint8Array): boolean {
  return mask.every((value) => value === 0);
}

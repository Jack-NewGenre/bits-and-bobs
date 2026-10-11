/** Cutting pieces out of a decoded image, and finding where the pieces are. */

import { withSuffix } from "@/lib/download";
import {
  clearBackdrop,
  findBackdrop,
  type Backdrop,
} from "@/lib/image/backdrop";
import {
  canvasToBlob,
  createCanvas2D,
  type AnyCanvas,
  type AnyCanvas2D,
} from "@/lib/image/canvas";
import { scaleRect, type Rect } from "@/lib/image/cut-rect";
import { detectPieces, type DetectSettings } from "@/lib/image/detect-pieces";
import type { Cut } from "@/lib/image/lasso";
import type { Bounds } from "@/lib/image/square-crop";

/** Detection only needs shapes, so it reads a copy no larger than this on its longer side. */
const DETECT_SIDE = 1200;

/** Clear this backdrop from around a cut-out. */
export interface BackdropRemoval {
  backdrop: Backdrop;
  tolerance: number;
}

export interface FoundPieces {
  pieces: Rect[];
  backdrop: Backdrop;
}

/** The factor detection shrinks an image by: 1 for anything already small. */
export function detectionScale({ width, height }: Bounds): number {
  return Math.min(1, DETECT_SIDE / Math.max(width, height));
}

/** Find every piece on the sheet, as boxes on the full-size image. */
export function findPiecesInImage(
  image: CanvasImageSource,
  bounds: Bounds,
  settings: DetectSettings,
): FoundPieces {
  const scale = detectionScale(bounds);
  const width = Math.max(1, Math.round(bounds.width * scale));
  const height = Math.max(1, Math.round(bounds.height * scale));
  const { ctx } = createCanvas2D(width, height);
  ctx.drawImage(image, 0, 0, width, height);

  const grid = ctx.getImageData(0, 0, width, height);
  const backdrop = findBackdrop(grid);
  const pieces = detectPieces(
    grid,
    { ...settings, gap: settings.gap * scale },
    backdrop,
  );
  // One shrunken pixel stands for several real ones, and soft edges fade into the backdrop.
  const margin = Math.ceil(1 / scale) + 1;
  return {
    backdrop,
    pieces: pieces.map((piece) => scaleRect(piece, 1 / scale, margin, bounds)),
  };
}

/** Limit drawing to the lasso outline, scaled to the canvas, so everything outside it stays clear. */
function clipToPath(
  ctx: AnyCanvas2D,
  cut: Cut,
  width: number,
  height: number,
): void {
  if (!cut.path) return;
  const [sx, sy] = [width / cut.width, height / cut.height];
  ctx.beginPath();
  cut.path.forEach(({ x, y }) => ctx.lineTo(x * sx, y * sy));
  ctx.closePath();
  ctx.clip();
}

/** Draw `cut` of the image to fill the canvas, clearing the backdrop if asked. */
export function paintCutout(
  canvas: AnyCanvas,
  image: CanvasImageSource,
  cut: Cut,
  removal?: BackdropRemoval,
): void {
  const ctx = canvas.getContext("2d") as AnyCanvas2D | null;
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  clipToPath(ctx, cut, width, height);
  ctx.drawImage(
    image,
    cut.x,
    cut.y,
    cut.width,
    cut.height,
    0,
    0,
    width,
    height,
  );
  ctx.restore();
  if (!removal) return;

  const pixels = ctx.getImageData(0, 0, width, height);
  clearBackdrop(pixels, removal.backdrop, removal.tolerance);
  ctx.putImageData(pixels, 0, 0);
}

/** One cut-out at full size, as a PNG so a cleared backdrop stays transparent. */
export function cutoutBlob(
  image: CanvasImageSource,
  cut: Cut,
  removal?: BackdropRemoval,
): Promise<Blob> {
  const { canvas } = createCanvas2D(cut.width, cut.height);
  paintCutout(canvas, image, cut, removal);
  return canvasToBlob(canvas, "image/png");
}

/** `sheet.jpg`, piece 0 → `sheet-1.png`. */
export function cutoutName(sourceName: string, index: number): string {
  return withSuffix(sourceName, `-${index + 1}`, "png");
}

/** Every cut-out, named in order, ready to zip. */
export function cutoutEntries(
  image: CanvasImageSource,
  cuts: Cut[],
  sourceName: string,
  removal?: BackdropRemoval,
): Promise<{ name: string; blob: Blob }[]> {
  return Promise.all(
    cuts.map(async (cut, index) => ({
      name: cutoutName(sourceName, index),
      blob: await cutoutBlob(image, cut, removal),
    })),
  );
}

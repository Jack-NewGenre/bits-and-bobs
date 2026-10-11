/** Getting pixels into the editor and a finished image back out of it. */

import {
  FabricImage,
  type Canvas,
  type FabricObject,
  type TMat2D,
} from "fabric";

import { canvasToBlob, createCanvas2D } from "@/lib/image/canvas";
import {
  fitWithin,
  MAX_DIMENSION,
  type EditorDocument,
} from "@/lib/image/editor/document";

export type ExportFormat = "png" | "jpeg" | "webp";

export interface ExportOptions {
  format: ExportFormat;
  /** Output size as a multiple of the document size. */
  scale: number;
  /** 0–1, ignored for PNG. */
  quality: number;
}

export const DEFAULT_EXPORT: ExportOptions = {
  format: "png",
  scale: 1,
  quality: 0.92,
};

const MIME: Record<ExportFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

const EXTENSION: Record<ExportFormat, string> = {
  png: "png",
  jpeg: "jpg",
  webp: "webp",
};

export function exportFilename(name: string, format: ExportFormat): string {
  const base = name.replace(/\.[^.]+$/, "").trim() || "image";
  return `${base}.${EXTENSION[format]}`;
}

/**
 * Loads an image file as a layer. The object URL is kept for the whole
 * session because undo rebuilds layers from their `src`, and a short blob URL
 * keeps each history snapshot small where a data URL would copy every pixel.
 *
 * Anything larger than the filter texture limit is resampled first, so
 * adjustments never have to tile a photo.
 */
export async function loadImageLayer(file: Blob): Promise<FabricImage> {
  const url = URL.createObjectURL(file);
  const image = await FabricImage.fromURL(url);
  const { width, height } = image;
  if (Math.max(width, height) <= MAX_DIMENSION) return image;

  const size = fitWithin(width, height);
  const { canvas, ctx } = createCanvas2D(size.width, size.height);
  ctx.drawImage(image.getElement(), 0, 0, size.width, size.height);
  URL.revokeObjectURL(url);
  const resized = await canvasToBlob(canvas, "image/png");
  return FabricImage.fromURL(URL.createObjectURL(resized));
}

const IDENTITY: TMat2D = [1, 0, 0, 1, 0, 0];

/**
 * Renders just the document area at a scale, with the on-screen zoom swapped
 * out for the duration and put straight back. `background` replaces the
 * canvas colour while drawing; an empty string leaves it transparent.
 * Passing `only` renders that one layer rather than every layer.
 */
export function renderDocument(
  canvas: Canvas,
  doc: EditorDocument,
  scale = 1,
  background = doc.background ?? "",
  only?: FabricObject,
): HTMLCanvasElement {
  const viewport = canvas.viewportTransform;
  const previous = canvas.backgroundColor;
  canvas.viewportTransform = IDENTITY;
  canvas.backgroundColor = background;
  try {
    return canvas.toCanvasElement(scale, {
      left: 0,
      top: 0,
      width: doc.width,
      height: doc.height,
      filter: only && ((object) => object === only),
    });
  } finally {
    canvas.viewportTransform = viewport;
    canvas.backgroundColor = previous;
    canvas.calcViewportBoundaries();
  }
}

/** The visible layers flattened, without the background, as the eyedropper, wand and fill see them. */
export function documentPixels(canvas: Canvas, doc: EditorDocument): ImageData {
  const element = renderDocument(canvas, doc, 1, "");
  const ctx = element.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  return ctx.getImageData(0, 0, element.width, element.height);
}

/** A JPEG cannot hold transparency, so a transparent document is flattened onto white. */
export async function exportDocument(
  canvas: Canvas,
  doc: EditorDocument,
  options: ExportOptions,
): Promise<Blob> {
  const opaque = options.format === "jpeg";
  const element = renderDocument(
    canvas,
    doc,
    options.scale,
    doc.background ?? (opaque ? "#ffffff" : ""),
  );
  return canvasToBlob(element, MIME[options.format], options.quality);
}

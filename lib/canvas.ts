/**
 * Shared canvas and async helpers for client-side image processing tools.
 *
 * The same pipelines run on the main thread and inside a worker, so a canvas
 * is either an `HTMLCanvasElement` or an `OffscreenCanvas` depending on where
 * the code happens to be executing. Everything below hides that difference.
 */

export type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;
export type AnyCanvas2D =
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D;

/** True when running inside a worker, where `document` does not exist. */
export function isOffscreenAvailable(): boolean {
  return typeof OffscreenCanvas !== "undefined";
}

export function createCanvas2D(
  width: number,
  height: number,
): { canvas: AnyCanvas; ctx: AnyCanvas2D } {
  const canvas: AnyCanvas =
    typeof document === "undefined"
      ? new OffscreenCanvas(width, height)
      : Object.assign(document.createElement("canvas"), { width, height });

  const ctx = canvas.getContext("2d") as AnyCanvas2D | null;
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  return { canvas, ctx };
}

export function canvasToBlob(
  canvas: AnyCanvas,
  type: string,
  quality?: number,
): Promise<Blob> {
  if ("convertToBlob" in canvas) {
    return canvas.convertToBlob({ type, quality });
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Failed to export canvas")),
      type,
      quality,
    );
  });
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
}

/** Yield to the event loop so the UI can paint before a heavy pass. */
export function nextTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Load an image element from a URL, resolving once it has decoded. */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load background image"));
    image.src = url;
  });
}

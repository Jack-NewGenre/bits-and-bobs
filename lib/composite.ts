/**
 * Canvas compositing helpers for the background remover.
 *
 * Takes a transparent cutout and renders it onto a chosen background
 * (transparent, a solid colour, or an uploaded image), returning a PNG blob.
 */

export type BackgroundMode = "transparent" | "color" | "image";

export interface CompositeOptions {
  mode: BackgroundMode;
  /** CSS colour, used when mode === "color". */
  color?: string;
  /** Background bitmap, used when mode === "image". */
  background?: ImageBitmap | HTMLImageElement | HTMLCanvasElement;
}

async function blobToBitmap(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob);
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to export canvas to PNG"));
    }, "image/png");
  });
}

/**
 * Composite the cutout over the requested background and return a PNG blob.
 * For `transparent` mode the cutout is returned re-encoded as-is.
 */
export async function compositeCutout(
  cutout: Blob,
  options: CompositeOptions,
): Promise<Blob> {
  const foreground = await blobToBitmap(cutout);
  const { width, height } = foreground;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  if (options.mode === "color" && options.color) {
    ctx.fillStyle = options.color;
    ctx.fillRect(0, 0, width, height);
  } else if (options.mode === "image" && options.background) {
    drawCover(ctx, options.background, width, height);
  }

  ctx.drawImage(foreground, 0, 0, width, height);
  foreground.close();

  return canvasToPngBlob(canvas);
}

/** Draw a source so it covers the target box, preserving aspect ratio. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  source: ImageBitmap | HTMLImageElement | HTMLCanvasElement,
  width: number,
  height: number,
): void {
  const sourceWidth = "width" in source ? source.width : width;
  const sourceHeight = "height" in source ? source.height : height;
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const offsetX = (width - drawWidth) / 2;
  const offsetY = (height - drawHeight) / 2;
  ctx.drawImage(source, offsetX, offsetY, drawWidth, drawHeight);
}

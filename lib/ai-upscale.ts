/**
 * Machine-learning super-resolution, running fully in the browser via
 * @huggingface/transformers. Images never leave the device. Only the model
 * weights are fetched once from the Hugging Face CDN and cached.
 *
 * The canvas upscaler enlarges by interpolating between existing pixels, then
 * fakes crispness with an unsharp mask; it can never add detail that was not
 * there. Swin2SR was trained on millions of low/high-resolution pairs, so it
 * reconstructs plausible detail instead, visibly better on the small, soft
 * images this tool exists for.
 *
 * It is also far slower and memory-hungry, growing with pixel count, so the
 * input is capped and callers fall back to the canvas path above that.
 */

import type { RawImage } from "@huggingface/transformers";

import { canvasToBlob, createCanvas2D, throwIfAborted } from "@/lib/canvas";

/** Documented Swin2SR checkpoint for classical 2x super-resolution. */
const MODEL_ID = "Xenova/swin2SR-classical-sr-x2-64";

/** The fixed factor this checkpoint upscales by. */
export const AI_SCALE = 2;

/**
 * Longest input edge the model is offered. Above this the transformer's
 * memory use becomes unreasonable in a browser tab, so the caller keeps to
 * the canvas path instead of risking a crashed page.
 */
export const AI_MAX_INPUT_DIM = 1024;

type Upscaler = (image: Blob | string) => Promise<RawImage>;

let upscalerPromise: Promise<Upscaler> | null = null;
let modelReady = false;

/** Whether an image is small enough to hand to the model. */
export function canUseAi(width: number, height: number): boolean {
  return Math.max(width, height) <= AI_MAX_INPUT_DIM;
}

export interface AiUpscaleProgress {
  /** True while the weights are still downloading (first use only). */
  isFetching: boolean;
  /** 0–1 fraction of the download, best-effort. */
  fraction: number;
}

export interface AiUpscaleOptions {
  onProgress?: (progress: AiUpscaleProgress) => void;
  signal?: AbortSignal;
}

/**
 * Whether the model has already been fetched and is ready to run. Only true
 * once the download has finished, so a load that is still in flight, or one
 * that failed, still counts as not loaded.
 */
export function isModelLoaded(): boolean {
  return modelReady;
}

function loadUpscaler(
  onProgress?: (progress: AiUpscaleProgress) => void,
): Promise<Upscaler> {
  return (upscalerPromise ??= (async () => {
    const { pipeline, env } = await import("@huggingface/transformers");
    // Always fetch from the CDN; never probe this origin for model files.
    env.allowLocalModels = false;

    const pipe = await pipeline("image-to-image", MODEL_ID, {
      progress_callback: (info) => {
        if (info.status === "progress") {
          onProgress?.({
            isFetching: true,
            fraction: (info.progress ?? 0) / 100,
          });
        }
      },
    });
    return pipe as unknown as Upscaler;
  })().then(
    (upscaler) => {
      modelReady = true;
      return upscaler;
    },
    (error: unknown) => {
      // A failed download must not be remembered. Caching the rejection would
      // leave the engine broken for the rest of the tab's life, even once the
      // network came back, because `??=` never replaces a settled promise.
      upscalerPromise = null;
      throw error;
    },
  ));
}

/**
 * Upscale an image by `AI_SCALE` and return it as a PNG blob.
 * Throws `DOMException` (name "AbortError") if aborted.
 */
export async function aiUpscale(
  source: Blob,
  { onProgress, signal }: AiUpscaleOptions = {},
): Promise<Blob> {
  throwIfAborted(signal);

  const upscaler = await loadUpscaler(onProgress);
  throwIfAborted(signal);

  onProgress?.({ isFetching: false, fraction: 0 });
  const output = await upscaler(source);
  throwIfAborted(signal);

  const { canvas, ctx } = createCanvas2D(output.width, output.height);
  const image = ctx.createImageData(output.width, output.height);
  image.data.set(rawImageToRgba(output));
  ctx.putImageData(image, 0, 0);

  return canvasToBlob(canvas, "image/png");
}

/**
 * Flatten a model output into an RGBA buffer. Swin2SR returns three channels,
 * so an opaque alpha channel is woven back in; a single channel is spread
 * across red, green and blue.
 */
export function rawImageToRgba(image: RawImage): Uint8ClampedArray {
  const { data, width, height, channels } = image;
  const pixels = new Uint8ClampedArray(width * height * 4);

  for (let pixel = 0; pixel < width * height; pixel++) {
    const from = pixel * channels;
    const to = pixel * 4;
    pixels[to] = data[from];
    pixels[to + 1] = data[from + (channels > 1 ? 1 : 0)];
    pixels[to + 2] = data[from + (channels > 2 ? 2 : 0)];
    pixels[to + 3] = channels === 4 ? data[from + 3] : 255;
  }

  return pixels;
}

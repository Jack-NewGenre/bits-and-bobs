/**
 * General-purpose background removal running fully in the browser via
 * @huggingface/transformers. Images never leave the device. Only the model
 * weights are fetched once (~44MB, q8) from the Hugging Face CDN and cached.
 *
 * Uses RMBG-1.4 (BRIA) loaded through the low-level AutoModel/AutoProcessor API.
 * Unlike MODNet (portrait-only) or the high-level background-removal pipeline,
 * RMBG-1.4 is trained for arbitrary subjects (people, products, animals,
 * patterns), so it generalises across the range of images a tools site sees.
 *
 * The model runs on WebGPU where the browser offers it, typically several
 * times faster than WASM for this network, and falls back to WASM otherwise.
 *
 * The model is loaded lazily via dynamic import and memoised across images.
 * This flow (model_type "custom", input key "input", output key "output" with
 * values already in 0–1, then RawImage.putAlpha) is verified end-to-end.
 */

import { throwIfAborted } from "@/lib/canvas";

import type * as Transformers from "@huggingface/transformers";
import type {
  PreTrainedModel,
  Processor,
  Tensor,
  RawImage,
  PretrainedConfig,
  ProgressInfo,
} from "@huggingface/transformers";

const MODEL_ID = "briaai/RMBG-1.4";

// RMBG-1.4 ships no transformers.js preprocessor config, so supply it inline.
const PROCESSOR_CONFIG = {
  do_normalize: true,
  do_pad: false,
  do_rescale: true,
  do_resize: true,
  image_mean: [0.5, 0.5, 0.5],
  image_std: [1, 1, 1],
  resample: 2,
  rescale_factor: 1 / 255,
  size: { width: 1024, height: 1024 },
};

type SegModel = (inputs: { input: Tensor }) => Promise<{ output: Tensor }>;
type ImageProcessor = (image: RawImage) => Promise<{ pixel_values: Tensor }>;

export type RemovalStage = "fetching" | "computing" | "done";

export interface RemovalProgress {
  /** High-level stage of the removal. */
  stage: RemovalStage;
  /** 0–1 fraction of the current stage (best-effort). */
  fraction: number;
}

export interface RemoveBackgroundOptions {
  onProgress?: (progress: RemovalProgress) => void;
  signal?: AbortSignal;
}

export interface CutoutResult {
  /** Transparent PNG with the background removed. */
  blob: Blob;
}

let modelPromise: Promise<PreTrainedModel> | null = null;
let processorPromise: Promise<Processor> | null = null;

export type RemovalDevice = "webgpu" | "wasm";

/** Minimal shape of `navigator.gpu`; the full WebGPU types are not needed. */
interface GpuLike {
  requestAdapter: () => Promise<unknown>;
}

/**
 * WebGPU when the browser exposes an adapter, WASM otherwise. Probed once and
 * reused, since the model is memoised against whichever device it loaded on.
 */
export async function detectDevice(): Promise<RemovalDevice> {
  const gpu = (navigator as Navigator & { gpu?: GpuLike }).gpu;
  if (!gpu) return "wasm";
  try {
    return (await gpu.requestAdapter()) ? "webgpu" : "wasm";
  } catch {
    return "wasm";
  }
}

function loadModel(
  tf: typeof Transformers,
  onProgress?: (progress: RemovalProgress) => void,
): Promise<PreTrainedModel> {
  return (modelPromise ??= (async () => {
    // Always fetch from the CDN; never probe this origin for model files.
    tf.env.allowLocalModels = false;
    const device = await detectDevice();
    return tf.AutoModel.from_pretrained(MODEL_ID, {
      config: { model_type: "custom" } as PretrainedConfig,
      device,
      // q8 is not a valid WebGPU quantisation for this model; fp16 is.
      dtype: device === "webgpu" ? "fp16" : "q8",
      progress_callback: (info: ProgressInfo) => {
        if (info.status === "progress") {
          onProgress?.({
            stage: "fetching",
            fraction: (info.progress ?? 0) / 100,
          });
        }
      },
    });
  })());
}

function loadProcessor(tf: typeof Transformers): Promise<Processor> {
  return (processorPromise ??= tf.AutoProcessor.from_pretrained(MODEL_ID, {
    config: PROCESSOR_CONFIG as unknown as PretrainedConfig,
  }));
}

/**
 * Remove the background from an image, returning a transparent PNG.
 * Throws `DOMException` (name "AbortError") if aborted.
 */
export async function removeImageBackground(
  source: Blob,
  { onProgress, signal }: RemoveBackgroundOptions = {},
): Promise<CutoutResult> {
  throwIfAborted(signal);

  const tf = await import("@huggingface/transformers");
  const { RawImage } = tf;
  const [model, processor] = await Promise.all([
    loadModel(tf, onProgress),
    loadProcessor(tf),
  ]);

  throwIfAborted(signal);

  onProgress?.({ stage: "computing", fraction: 0 });

  const image = await RawImage.fromBlob(source);
  const { pixel_values } = await (processor as unknown as ImageProcessor)(image);
  const { output } = await (model as unknown as SegModel)({
    input: pixel_values,
  });

  // Reduce [1, 1, H, W] to a single-channel [1, H, W] mask tensor.
  let maskTensor = output;
  while (maskTensor.dims.length > 3) {
    maskTensor = maskTensor.squeeze(0);
  }

  const mask = await RawImage.fromTensor(
    maskTensor.mul(255).to("uint8"),
  ).resize(image.width, image.height);

  const cutout = image.clone().putAlpha(mask);
  const blob = (await cutout.toBlob("image/png")) as Blob;

  throwIfAborted(signal);

  onProgress?.({ stage: "done", fraction: 1 });
  return { blob };
}

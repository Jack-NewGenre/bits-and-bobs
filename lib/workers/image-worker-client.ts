"use client";

/**
 * The image pipelines, as seen by the tools: one typed function per job.
 *
 * Each hands the work to a pooled worker, and runs the very same pipeline on
 * the main thread when there is no worker to be had, so a browser that cannot
 * support them still works. `worker-pool` owns the workers themselves.
 */

import {
  compositeWithSettings,
  type BackgroundSettings,
} from "@/lib/image/composite";
import { enhanceImage, type EnhanceResult, type EnhanceSettings } from "@/lib/image/enhance";
import {
  transformImage,
  type TransformResult,
  type TransformSettings,
} from "@/lib/image/transform";
import {
  vectorizeImage,
  type VectorizeResult,
  type VectorizeSettings,
} from "@/lib/image/vectorize";
import { isAbortError } from "@/lib/utils";
import {
  acquire,
  runOnWorker,
  workerConcurrency,
  type JobOptions,
} from "@/lib/workers/worker-pool";

export { workerConcurrency, type JobOptions };

/** Enhance an image off the main thread, falling back to it when necessary. */
export async function enhanceInWorker(
  source: Blob,
  settings: EnhanceSettings,
  options: JobOptions = {},
): Promise<EnhanceResult> {
  const entry = await acquire();
  if (!entry) {
    return enhanceImage(source, settings, {
      onProgress: options.onProgress,
      signal: options.signal,
      maxOutputDim: options.maxDim,
      scaleOverride: options.scaleOverride,
    });
  }
  return runOnWorker(entry, "enhance", source, settings, options);
}

/** Trace an image off the main thread, falling back to it when necessary. */
export async function vectorizeInWorker(
  source: Blob,
  settings: VectorizeSettings,
  options: JobOptions = {},
): Promise<VectorizeResult> {
  const entry = await acquire();
  if (!entry) {
    return vectorizeImage(source, settings, {
      onProgress: options.onProgress,
      signal: options.signal,
      maxTraceDim: options.maxDim,
    });
  }
  return runOnWorker(entry, "vectorize", source, settings, options);
}

/** Convert, resize or recompress off the main thread, falling back to it. */
export async function transformInWorker(
  source: Blob,
  settings: TransformSettings,
  options: JobOptions = {},
): Promise<TransformResult> {
  const entry = await acquire();
  if (!entry) {
    return transformImage(source, settings, {
      onProgress: options.onProgress,
      signal: options.signal,
    });
  }
  return runOnWorker(entry, "transform", source, settings, options);
}

/**
 * Composite a cutout onto its background off the main thread.
 *
 * The feather slider re-runs this on every change, and on a large photo the
 * pass reads and rewrites every pixel then encodes a PNG, which is exactly the
 * kind of work that makes a slider feel stuck when it happens on the UI thread.
 */
export async function compositeInWorker(
  source: Blob,
  settings: BackgroundSettings,
  options: JobOptions = {},
): Promise<{ blob: Blob }> {
  const entry = await acquire();
  if (!entry) return compositeWithSettings(source, settings);

  try {
    return await runOnWorker(entry, "composite", source, settings, options);
  } catch (error) {
    // Unlike the other pipelines this one reaches outside itself, to read the
    // chosen background from an object URL. Rather than leave the tool broken
    // if a browser will not serve that URL to a worker, the pass is retried
    // where the URL was created. An abort is the caller's own doing, so it is
    // passed straight back.
    if (isAbortError(error)) throw error;
    return compositeWithSettings(source, settings);
  }
}

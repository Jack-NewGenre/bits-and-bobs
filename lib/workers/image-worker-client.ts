"use client";

/**
 * Client for the image worker, with a main-thread fallback.
 *
 * One worker is shared by every tool and kept alive between jobs, so the
 * module is only compiled and loaded once. If the browser cannot support the
 * off-thread pipelines, or the worker fails to start at all, the same
 * functions run inline instead, so the tools always work.
 */

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
import type {
  JobKind,
  JobResultByKind,
  JobSettingsByKind,
  WorkerResponse,
} from "@/lib/workers/protocol";

export interface JobOptions {
  onProgress?: (progress: { fraction: number }) => void;
  signal?: AbortSignal;
  /** Cap on the longest edge, used to render cheap live previews. */
  maxDim?: number;
  /** Enhance only: resample by this factor instead of `settings.scale`. */
  scaleOverride?: number;
}

interface Pending {
  resolve: (result: JobResultByKind[JobKind]) => void;
  reject: (error: unknown) => void;
  onProgress?: (progress: { fraction: number }) => void;
}

/**
 * The worker is bundled separately by `bun run build:worker` into
 * `public/image-worker.js`. Next's bundler copies a `new Worker(new URL(...))`
 * target through verbatim rather than compiling it, so a worker written in
 * TypeScript with project imports would reach the browser unparsed; building
 * it ourselves produces one self-contained module instead.
 */
const WORKER_URL = "/image-worker.js";

/** How long to wait for the worker's readiness handshake before giving up. */
const READY_TIMEOUT_MS = 4000;

const pending = new Map<number, Pending>();
let workerPromise: Promise<Worker | null> | undefined;
let nextId = 0;

function failAll(reason: Error): void {
  pending.forEach((entry) => entry.reject(reason));
  pending.clear();
}

function handleMessage(event: MessageEvent<WorkerResponse>): void {
  const message = event.data;
  if (message.type === "ready") return;

  const entry = pending.get(message.id);
  if (!entry) return;

  if (message.type === "progress") {
    entry.onProgress?.({ fraction: message.fraction });
    return;
  }

  pending.delete(message.id);
  if (message.type === "result") {
    entry.resolve(message.result);
    return;
  }
  entry.reject(
    message.aborted
      ? new DOMException("Aborted", "AbortError")
      : new Error(message.message),
  );
}

/** Start the worker once and resolve only after it reports it can cope. */
function getWorker(): Promise<Worker | null> {
  return (workerPromise ??= new Promise<Worker | null>((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(WORKER_URL, { type: "module" });
    } catch {
      resolve(null);
      return;
    }

    const settle = (value: Worker | null) => {
      clearTimeout(timer);
      if (value === null) worker.terminate();
      resolve(value);
    };

    const timer = setTimeout(() => settle(null), READY_TIMEOUT_MS);

    worker.addEventListener("message", (event: MessageEvent<WorkerResponse>) => {
      if (event.data.type === "ready") {
        settle(event.data.supported ? worker : null);
        return;
      }
      handleMessage(event);
    });

    worker.addEventListener("error", () => {
      // A worker that has died cannot serve the jobs still waiting on it.
      // Replacing the memo is what makes everything afterwards run inline
      // rather than restarting a worker that has already proved broken: once
      // the readiness handshake has resolved this promise, `settle` can only
      // terminate the worker, not change what the promise resolved to. Posting
      // to a terminated worker is silently dropped, so a job handed one would
      // never settle at all.
      failAll(new Error("Image worker stopped unexpectedly"));
      workerPromise = Promise.resolve(null);
      settle(null);
    });
  }));
}

function runOnWorker<K extends JobKind>(
  worker: Worker,
  kind: K,
  source: Blob,
  settings: JobSettingsByKind[K],
  { onProgress, signal, maxDim, scaleOverride }: JobOptions,
): Promise<JobResultByKind[K]> {
  const id = (nextId += 1);

  return new Promise<JobResultByKind[K]>((resolve, reject) => {
    pending.set(id, {
      resolve: resolve as Pending["resolve"],
      reject,
      onProgress,
    });

    signal?.addEventListener(
      "abort",
      () => {
        if (!pending.delete(id)) return;
        worker.postMessage({ id, kind: "cancel" });
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );

    worker.postMessage({ id, kind, source, settings, maxDim, scaleOverride });
  });
}

/** Enhance an image off the main thread, falling back to it when necessary. */
export async function enhanceInWorker(
  source: Blob,
  settings: EnhanceSettings,
  options: JobOptions = {},
): Promise<EnhanceResult> {
  const worker = await getWorker();
  if (!worker) {
    return enhanceImage(source, settings, {
      onProgress: options.onProgress,
      signal: options.signal,
      maxOutputDim: options.maxDim,
      scaleOverride: options.scaleOverride,
    });
  }
  return runOnWorker(worker, "enhance", source, settings, options);
}

/** Trace an image off the main thread, falling back to it when necessary. */
export async function vectorizeInWorker(
  source: Blob,
  settings: VectorizeSettings,
  options: JobOptions = {},
): Promise<VectorizeResult> {
  const worker = await getWorker();
  if (!worker) {
    return vectorizeImage(source, settings, {
      onProgress: options.onProgress,
      signal: options.signal,
      maxTraceDim: options.maxDim,
    });
  }
  return runOnWorker(worker, "vectorize", source, settings, options);
}

/** Convert, resize or recompress off the main thread, falling back to it. */
export async function transformInWorker(
  source: Blob,
  settings: TransformSettings,
  options: JobOptions = {},
): Promise<TransformResult> {
  const worker = await getWorker();
  if (!worker) {
    return transformImage(source, settings, {
      onProgress: options.onProgress,
      signal: options.signal,
    });
  }
  return runOnWorker(worker, "transform", source, settings, options);
}

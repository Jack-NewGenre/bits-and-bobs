"use client";

/**
 * Client for the inpaint worker. One worker is started on first use and reused; where workers
 * are unavailable, or the worker fails, the fill runs on the main thread instead.
 */

import { contentAwareFill } from "@/lib/image/editor/content-aware";
import type { PixelGrid } from "@/lib/image/editor/pixels";
import type {
  InpaintWorkerRequest,
  InpaintWorkerResponse,
} from "@/lib/workers/inpaint-worker";

/** Built by `bun run build:worker`; see `image-worker-client` for why. */
const WORKER_URL = "/inpaint-worker.js";

interface Job {
  image: PixelGrid;
  hole: Uint8Array;
  onProgress?: (fraction: number) => void;
  resolve: (data: Uint8ClampedArray) => void;
  reject: (error: unknown) => void;
}

let worker: Worker | null = null;
let unavailable = false;
const pending = new Map<number, Job>();
let nextId = 0;

function runInline(job: Job): void {
  try {
    job.resolve(
      contentAwareFill(job.image, job.hole, { onProgress: job.onProgress }),
    );
  } catch (error) {
    job.reject(error);
  }
}

function handleMessage(event: MessageEvent<InpaintWorkerResponse>): void {
  const message = event.data;
  const job = pending.get(message.id);
  if (!job) return;
  if (message.type === "progress") {
    job.onProgress?.(message.fraction);
    return;
  }
  pending.delete(message.id);
  if (message.type === "result") {
    job.onProgress?.(1);
    job.resolve(new Uint8ClampedArray(message.data));
  } else {
    job.reject(new Error(message.message));
  }
}

/** A worker that cannot load or crashes is given up on, and its jobs finish inline. */
function handleFailure(): void {
  unavailable = true;
  worker?.terminate();
  worker = null;
  const jobs = [...pending.values()];
  pending.clear();
  jobs.forEach(runInline);
}

function getWorker(): Worker | null {
  if (unavailable || typeof Worker === "undefined") return null;
  if (worker) return worker;
  try {
    worker = new Worker(WORKER_URL, { type: "module" });
  } catch {
    unavailable = true;
    return null;
  }
  worker.addEventListener("message", handleMessage);
  worker.addEventListener("error", handleFailure);
  return worker;
}

/** Content-aware fill on the inpaint worker; neither `image` nor `hole` is modified. */
export function contentAwareFillInWorker(
  image: PixelGrid,
  hole: Uint8Array,
  onProgress?: (fraction: number) => void,
): Promise<Uint8ClampedArray> {
  return new Promise((resolve, reject) => {
    const job: Job = { image, hole, onProgress, resolve, reject };
    const active = getWorker();
    if (!active) {
      runInline(job);
      return;
    }
    const id = (nextId += 1);
    pending.set(id, job);
    // Copies are transferred so the caller's buffers stay usable, including for a fallback.
    const data = image.data.slice().buffer;
    const holeCopy = hole.slice().buffer;
    const request: InpaintWorkerRequest = {
      id,
      width: image.width,
      height: image.height,
      data,
      hole: holeCopy,
    };
    active.postMessage(request, [data, holeCopy]);
  });
}

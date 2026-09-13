/**
 * Runs the enhance and vectorize pipelines off the main thread.
 *
 * Both pipelines are pixel-heavy (a 4x upscale sharpens tens of millions of
 * subpixels) which freezes the page when it happens on the UI thread. The
 * work is identical here; only the canvas differs (`OffscreenCanvas`), which
 * `lib/canvas` already abstracts.
 */

import { enhanceImage } from "@/lib/image/enhance";
import { transformImage } from "@/lib/image/transform";
import { vectorizeImage } from "@/lib/image/vectorize";
import type {
  JobRequest,
  WorkerRequest,
  WorkerResponse,
} from "@/lib/workers/protocol";

const controllers = new Map<number, AbortController>();

function post(message: WorkerResponse): void {
  self.postMessage(message);
}

/**
 * Whether this browser can actually run the pipelines off-thread. Safari only
 * gained `ctx.filter` on an offscreen canvas recently, and the tone pass
 * depends on it, so the client falls back rather than producing flat output.
 */
function isSupported(): boolean {
  try {
    if (typeof OffscreenCanvas === "undefined") return false;
    const ctx = new OffscreenCanvas(1, 1).getContext("2d");
    return ctx !== null && "filter" in ctx;
  } catch {
    return false;
  }
}

async function runJob(request: JobRequest): Promise<void> {
  const controller = new AbortController();
  controllers.set(request.id, controller);

  const onProgress = ({ fraction }: { fraction: number }) =>
    post({ type: "progress", id: request.id, fraction });

  try {
    const signal = controller.signal;
    const result =
      request.kind === "enhance"
        ? await enhanceImage(request.source, request.settings, {
            onProgress,
            signal,
            maxOutputDim: request.maxDim,
            scaleOverride: request.scaleOverride,
          })
        : request.kind === "transform"
          ? await transformImage(request.source, request.settings, {
              onProgress,
              signal,
            })
          : await vectorizeImage(request.source, request.settings, {
              onProgress,
              signal,
              maxTraceDim: request.maxDim,
            });

    post({ type: "result", id: request.id, result });
  } catch (error) {
    post({
      type: "error",
      id: request.id,
      message: error instanceof Error ? error.message : "Processing failed",
      aborted: error instanceof Error && error.name === "AbortError",
    });
  } finally {
    controllers.delete(request.id);
  }
}

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  if (request.kind === "cancel") {
    controllers.get(request.id)?.abort();
    controllers.delete(request.id);
    return;
  }
  void runJob(request);
});

post({ type: "ready", supported: isSupported() });

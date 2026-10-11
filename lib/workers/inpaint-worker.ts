/**
 * Runs content-aware fill off the main thread, so a large hole never freezes the editor.
 * Bundled to `public/inpaint-worker.js` by `bun run build:worker`.
 */

import { contentAwareFill } from "@/lib/image/editor/content-aware";

export interface InpaintWorkerRequest {
  id: number;
  width: number;
  height: number;
  data: ArrayBuffer;
  hole: ArrayBuffer;
}

export type InpaintWorkerResponse =
  | { id: number; type: "progress"; fraction: number }
  | { id: number; type: "result"; data: ArrayBuffer }
  | { id: number; type: "error"; message: string };

function post(
  message: InpaintWorkerResponse,
  transfer: Transferable[] = [],
): void {
  self.postMessage(message, { transfer });
}

self.addEventListener(
  "message",
  (event: MessageEvent<InpaintWorkerRequest>) => {
    const { id, width, height, data, hole } = event.data;
    try {
      const filled = contentAwareFill(
        { data: new Uint8ClampedArray(data), width, height },
        new Uint8Array(hole),
        { onProgress: (fraction) => post({ id, type: "progress", fraction }) },
      );
      post({ id, type: "result", data: filled.buffer }, [filled.buffer]);
    } catch (error) {
      post({
        id,
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

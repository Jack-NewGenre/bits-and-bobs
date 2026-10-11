import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { contentAwareFill } from "@/lib/image/editor/content-aware";
import type { PixelGrid } from "@/lib/image/editor/pixels";
import type {
  InpaintWorkerRequest,
  InpaintWorkerResponse,
} from "@/lib/workers/inpaint-worker";

let workers: FakeWorker[];

class FakeWorker {
  posted: InpaintWorkerRequest[] = [];
  terminated = false;
  private listeners = new Map<string, ((event: unknown) => void)[]>();

  constructor() {
    workers.push(this);
  }

  addEventListener(type: string, listener: (event: unknown) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  postMessage(message: InpaintWorkerRequest): void {
    this.posted.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(data: InpaintWorkerResponse): void {
    this.listeners.get("message")?.forEach((listener) => listener({ data }));
  }

  fail(): void {
    this.listeners.get("error")?.forEach((listener) => listener({}));
  }
}

function makeCase(): { image: PixelGrid; hole: Uint8Array } {
  const width = 24;
  const height = 24;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++)
    data.set([(i % width) * 9, 80, 120, 255], i * 4);
  const hole = new Uint8Array(width * height);
  for (let y = 9; y < 15; y++) hole.fill(255, y * width + 9, y * width + 15);
  return { image: { data, width, height }, hole };
}

async function importClient() {
  return import("@/lib/workers/inpaint-worker-client");
}

beforeEach(() => {
  vi.resetModules();
  workers = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("contentAwareFillInWorker", () => {
  it("runs on the main thread where Worker is undefined", async () => {
    vi.stubGlobal("Worker", undefined);
    const { contentAwareFillInWorker } = await importClient();
    const { image, hole } = makeCase();
    const progress = vi.fn();
    const filled = await contentAwareFillInWorker(image, hole, progress);
    expect(filled).toEqual(contentAwareFill(image, hole));
    expect(progress).toHaveBeenLastCalledWith(1);
  });

  it("posts copies to the worker and resolves with its result", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const { contentAwareFillInWorker } = await importClient();
    const { image, hole } = makeCase();
    const progress = vi.fn();
    const promise = contentAwareFillInWorker(image, hole, progress);

    const [worker] = workers;
    const { id, data } = worker.posted[0];
    expect(data).not.toBe(image.data.buffer);
    worker.emit({ id, type: "progress", fraction: 0.5 });
    worker.emit({
      id,
      type: "result",
      data: new Uint8ClampedArray([1, 2, 3, 4]).buffer,
    });

    await expect(promise).resolves.toEqual(new Uint8ClampedArray([1, 2, 3, 4]));
    expect(progress).toHaveBeenCalledWith(0.5);
  });

  it("falls back to the main thread when the worker fails to start", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const { contentAwareFillInWorker } = await importClient();
    const { image, hole } = makeCase();
    const promise = contentAwareFillInWorker(image, hole);

    workers[0].fail();
    await expect(promise).resolves.toEqual(contentAwareFill(image, hole));
    expect(workers[0].terminated).toBe(true);

    await contentAwareFillInWorker(image, hole);
    expect(workers).toHaveLength(1);
  });

  it("rejects when the worker reports an error", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const { contentAwareFillInWorker } = await importClient();
    const { image, hole } = makeCase();
    const promise = contentAwareFillInWorker(image, hole);
    workers[0].emit({
      id: workers[0].posted[0].id,
      type: "error",
      message: "boom",
    });
    await expect(promise).rejects.toThrow("boom");
  });
});

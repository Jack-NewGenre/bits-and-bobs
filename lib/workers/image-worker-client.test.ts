import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_ENHANCE_SETTINGS } from "@/lib/image/enhance-presets";
import type { WorkerResponse } from "@/lib/workers/protocol";

const enhanceImage = vi.fn();
const vectorizeImage = vi.fn();

vi.mock("@/lib/image/enhance", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/image/enhance")>()),
  enhanceImage: (...args: unknown[]) => enhanceImage(...args),
}));

vi.mock("@/lib/image/vectorize", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/image/vectorize")>()),
  vectorizeImage: (...args: unknown[]) => vectorizeImage(...args),
}));

interface PostedMessage {
  id: number;
  kind: string;
}

let workers: FakeWorker[];
let constructionError: Error | undefined;

class FakeWorker {
  posted: PostedMessage[] = [];
  terminated = false;
  private listeners = new Map<string, ((event: unknown) => void)[]>();

  constructor() {
    if (constructionError) throw constructionError;
    workers.push(this);
  }

  addEventListener(type: string, listener: (event: unknown) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  postMessage(message: PostedMessage): void {
    this.posted.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  /** Deliver a message from the worker to the client. */
  emit(data: WorkerResponse): void {
    this.listeners.get("message")?.forEach((listener) => listener({ data }));
  }

  fail(): void {
    this.listeners.get("error")?.forEach((listener) => listener({}));
  }
}

async function importClient() {
  return import("@/lib/workers/image-worker-client");
}

const source = new Blob(["image"], { type: "image/png" });
const result = {
  blob: new Blob(["out"]),
  sourceWidth: 1,
  sourceHeight: 1,
  width: 2,
  height: 2,
  fullWidth: 2,
  fullHeight: 2,
};

beforeEach(() => {
  vi.resetModules();
  workers = [];
  constructionError = undefined;
  enhanceImage.mockReset().mockResolvedValue(result);
  vectorizeImage.mockReset().mockResolvedValue({ svg: "<svg/>", blob: new Blob(), rawBytes: 5 });
  vi.stubGlobal("Worker", FakeWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Let the client attach its listeners before the worker answers. */
async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("enhanceInWorker", () => {
  it("runs the job on the worker once it reports it is supported", async () => {
    const { enhanceInWorker } = await importClient();
    const onProgress = vi.fn();
    const pending = enhanceInWorker(source, DEFAULT_ENHANCE_SETTINGS, {
      onProgress,
    });

    await flush();
    const worker = workers[0];
    worker.emit({ type: "ready", supported: true });
    await flush();

    const job = worker.posted[0];
    expect(job.kind).toBe("enhance");

    worker.emit({ type: "progress", id: job.id, fraction: 0.5 });
    worker.emit({ type: "result", id: job.id, result });

    await expect(pending).resolves.toBe(result);
    expect(onProgress).toHaveBeenCalledWith({ fraction: 0.5 });
    expect(enhanceImage).not.toHaveBeenCalled();
  });

  it("falls back to the main thread when the worker cannot cope", async () => {
    const { enhanceInWorker } = await importClient();
    const pending = enhanceInWorker(source, DEFAULT_ENHANCE_SETTINGS);

    await flush();
    workers[0].emit({ type: "ready", supported: false });

    await expect(pending).resolves.toBe(result);
    expect(enhanceImage).toHaveBeenCalledTimes(1);
    expect(workers[0].terminated).toBe(true);
  });

  it("falls back when the worker cannot even be constructed", async () => {
    constructionError = new Error("blocked");
    const { enhanceInWorker } = await importClient();

    await expect(
      enhanceInWorker(source, DEFAULT_ENHANCE_SETTINGS),
    ).resolves.toBe(result);
    expect(enhanceImage).toHaveBeenCalledTimes(1);
  });

  it("cancels the job on the worker when the caller aborts", async () => {
    const { enhanceInWorker } = await importClient();
    const controller = new AbortController();
    const pending = enhanceInWorker(source, DEFAULT_ENHANCE_SETTINGS, {
      signal: controller.signal,
    });

    await flush();
    const worker = workers[0];
    worker.emit({ type: "ready", supported: true });
    await flush();

    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(worker.posted.at(-1)).toMatchObject({ kind: "cancel" });
  });

  it("surfaces a worker-side failure as a normal error", async () => {
    const { enhanceInWorker } = await importClient();
    const pending = enhanceInWorker(source, DEFAULT_ENHANCE_SETTINGS);

    await flush();
    const worker = workers[0];
    worker.emit({ type: "ready", supported: true });
    await flush();

    worker.emit({
      type: "error",
      id: worker.posted[0].id,
      message: "Out of memory",
      aborted: false,
    });

    await expect(pending).rejects.toThrow("Out of memory");
  });

  it("runs a transform job on the worker too", async () => {
    const { transformInWorker } = await importClient();
    const { DEFAULT_TRANSFORM_SETTINGS } = await import("@/lib/image/transform");
    const transformResult = {
      blob: new Blob(["out"]),
      sourceWidth: 4,
      sourceHeight: 2,
      width: 2,
      height: 1,
      sourceBytes: 9,
    };

    const pending = transformInWorker(source, DEFAULT_TRANSFORM_SETTINGS);
    await flush();
    const worker = workers[0];
    worker.emit({ type: "ready", supported: true });
    await flush();

    expect(worker.posted[0].kind).toBe("transform");
    worker.emit({
      type: "result",
      id: worker.posted[0].id,
      result: transformResult,
    });
    await expect(pending).resolves.toBe(transformResult);
  });

  it("reuses one worker across jobs and tools", async () => {
    const { enhanceInWorker, vectorizeInWorker } = await importClient();
    const first = enhanceInWorker(source, DEFAULT_ENHANCE_SETTINGS);
    await flush();
    workers[0].emit({ type: "ready", supported: true });
    await flush();

    const { DEFAULT_VECTORIZE_SETTINGS } = await import("@/lib/image/vectorize");
    const second = vectorizeInWorker(source, DEFAULT_VECTORIZE_SETTINGS);
    await flush();

    expect(workers).toHaveLength(1);
    const worker = workers[0];
    expect(worker.posted.map((message) => message.kind)).toEqual([
      "enhance",
      "vectorize",
    ]);

    worker.emit({ type: "result", id: worker.posted[0].id, result });
    worker.emit({
      type: "result",
      id: worker.posted[1].id,
      result: { svg: "<svg/>", blob: new Blob(), rawBytes: 5 },
    });
    await expect(first).resolves.toBe(result);
    await expect(second).resolves.toMatchObject({ svg: "<svg/>" });
  });
});

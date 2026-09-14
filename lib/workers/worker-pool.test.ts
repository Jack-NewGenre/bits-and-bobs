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

describe("the worker pool", () => {
  /** Pretend to be a machine with `cores` cores. */
  const withCores = (cores: number) =>
    vi.stubGlobal("navigator", { ...globalThis.navigator, hardwareConcurrency: cores });

  async function startPool() {
    const client = await importClient();
    const first = client.enhanceInWorker(source, DEFAULT_ENHANCE_SETTINGS);
    await flush();
    workers[0].emit({ type: "ready", supported: true });
    await flush();
    return { client, first };
  }

  it("leaves a core for the interface and caps the pool", async () => {
    withCores(8);
    const { workerConcurrency } = await importClient();
    expect(workerConcurrency()).toBe(4);

    withCores(4);
    expect(workerConcurrency()).toBe(3);

    withCores(1);
    expect(workerConcurrency()).toBe(1);
  });

  it("spreads a batch started all at once over separate workers", async () => {
    withCores(4); // limit of 3
    const client = await importClient();

    // A queue opens every lane in one go, so all three calls park on the
    // readiness handshake before any of them has posted anything. Nothing is
    // awaited in between, which is what tells the lanes apart from the
    // staggered calls the other cases make.
    const jobs = [
      client.enhanceInWorker(source, DEFAULT_ENHANCE_SETTINGS),
      client.enhanceInWorker(source, DEFAULT_ENHANCE_SETTINGS),
      client.enhanceInWorker(source, DEFAULT_ENHANCE_SETTINGS),
    ];
    await flush();
    workers[0].emit({ type: "ready", supported: true });
    await flush();
    await flush();

    expect(workers).toHaveLength(3);
    expect(workers.map((worker) => worker.posted.length)).toEqual([1, 1, 1]);

    workers.forEach((worker) => worker.emit({ type: "result", id: worker.posted[0].id, result }));
    await expect(Promise.all(jobs)).resolves.toEqual([result, result, result]);
  });

  it("starts another worker rather than queueing behind a busy one", async () => {
    withCores(4);
    const { client, first } = await startPool();

    const second = client.enhanceInWorker(source, DEFAULT_ENHANCE_SETTINGS);
    await flush();

    expect(workers).toHaveLength(2);
    expect(workers[1].posted).toHaveLength(1);

    workers[0].emit({ type: "result", id: workers[0].posted[0].id, result });
    workers[1].emit({ type: "result", id: workers[1].posted[0].id, result });
    await expect(first).resolves.toBe(result);
    await expect(second).resolves.toBe(result);
  });

  it("stops growing at the limit and doubles up instead", async () => {
    withCores(3); // limit of 2
    const { client, first } = await startPool();

    const rest = [
      client.enhanceInWorker(source, DEFAULT_ENHANCE_SETTINGS),
      client.enhanceInWorker(source, DEFAULT_ENHANCE_SETTINGS),
    ];
    await flush();
    await flush();

    expect(workers).toHaveLength(2);
    // Four jobs over two workers: the third had to share.
    const posted = workers.map((worker) => worker.posted.length);
    expect(posted.reduce((sum, n) => sum + n, 0)).toBe(3);

    workers.forEach((worker) =>
      worker.posted.forEach((job) =>
        worker.emit({ type: "result", id: job.id, result }),
      ),
    );
    await expect(Promise.all([first, ...rest])).resolves.toHaveLength(3);
  });

  it("never starts a second worker on a single-core machine", async () => {
    withCores(1);
    const { client, first } = await startPool();

    const second = client.enhanceInWorker(source, DEFAULT_ENHANCE_SETTINGS);
    await flush();

    expect(workers).toHaveLength(1);
    workers[0].posted.forEach((job) =>
      workers[0].emit({ type: "result", id: job.id, result }),
    );
    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
  });

  it("a dying worker fails only its own jobs", async () => {
    withCores(4);
    const { client, first } = await startPool();

    const second = client.enhanceInWorker(source, DEFAULT_ENHANCE_SETTINGS);
    await flush();
    expect(workers).toHaveLength(2);

    workers[1].fail();
    await expect(second).rejects.toThrow("Image worker stopped unexpectedly");

    // The healthy worker carries on, rather than the whole pool collapsing.
    workers[0].emit({ type: "result", id: workers[0].posted[0].id, result });
    await expect(first).resolves.toBe(result);
  });
});

describe("compositeInWorker", () => {
  const settings = {
    mode: "image" as const,
    color: "#ffffff",
    feather: 0,
    trim: false,
    imageUrl: "blob:background",
  };

  it("falls back to the main thread when the worker cannot do it", async () => {
    const { compositeInWorker } = await importClient();
    const composited = { blob: new Blob(["fallback"]) };
    const compositeWithSettings = vi
      .spyOn(await import("@/lib/image/composite"), "compositeWithSettings")
      .mockResolvedValue(composited);

    const pending = compositeInWorker(source, settings);
    await flush();
    const worker = workers[0];
    worker.emit({ type: "ready", supported: true });
    await flush();

    // A worker that cannot read the background URL must not leave the tool
    // broken; the pass is retried where that URL was created.
    worker.emit({
      type: "error",
      id: worker.posted[0].id,
      message: "Failed to fetch",
      aborted: false,
    });

    await expect(pending).resolves.toBe(composited);
    expect(compositeWithSettings).toHaveBeenCalledTimes(1);
  });

  it("passes an abort back rather than quietly redoing the work", async () => {
    const { compositeInWorker } = await importClient();
    const compositeWithSettings = vi.spyOn(
      await import("@/lib/image/composite"),
      "compositeWithSettings",
    );

    const controller = new AbortController();
    const pending = compositeInWorker(source, settings, {
      signal: controller.signal,
    });
    await flush();
    workers[0].emit({ type: "ready", supported: true });
    await flush();

    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(compositeWithSettings).not.toHaveBeenCalled();
  });
});

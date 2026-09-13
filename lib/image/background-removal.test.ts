import { beforeEach, describe, expect, it, vi } from "vitest";

interface FromPretrainedOpts {
  progress_callback?: (info: { status: string; progress?: number }) => void;
}

const {
  envMock,
  autoModelMock,
  autoProcessorMock,
  rawImageMock,
  modelFn,
  processorFn,
  outputBlob,
} = vi.hoisted(() => {
  const blob = new Blob(["png"], { type: "image/png" });

  const maskTensor = {
    dims: [1, 4, 4],
    mul: vi.fn(() => maskTensor),
    to: vi.fn(() => maskTensor),
  };
  const outputTensor = {
    dims: [1, 1, 4, 4],
    squeeze: vi.fn(() => maskTensor),
  };

  const clonedImage = {
    putAlpha: vi.fn(() => clonedImage),
    toBlob: vi.fn(async () => blob),
  };
  const sourceImage = { width: 8, height: 8, clone: vi.fn(() => clonedImage) };

  return {
    envMock: { allowLocalModels: true },
    modelFn: vi.fn(async () => ({ output: outputTensor })),
    processorFn: vi.fn(async () => ({ pixel_values: {} })),
    rawImageMock: {
      fromBlob: vi.fn(async () => sourceImage),
      fromTensor: vi.fn(() => ({ resize: vi.fn(async () => ({})) })),
    },
    autoModelMock: { from_pretrained: vi.fn() },
    autoProcessorMock: { from_pretrained: vi.fn() },
    outputBlob: blob,
  };
});

vi.mock("@huggingface/transformers", () => ({
  env: envMock,
  AutoModel: autoModelMock,
  AutoProcessor: autoProcessorMock,
  RawImage: rawImageMock,
}));

// The model/processor are memoised at module scope, so import fresh per test.
async function importFresh() {
  return (await import("@/lib/image/background-removal")).removeImageBackground;
}

const source = new Blob(["image"], { type: "image/png" });

beforeEach(() => {
  vi.resetModules();
  envMock.allowLocalModels = true;
  autoModelMock.from_pretrained.mockReset().mockResolvedValue(modelFn);
  autoProcessorMock.from_pretrained.mockReset().mockResolvedValue(processorFn);
  rawImageMock.fromBlob.mockClear();
});

describe("removeImageBackground", () => {
  it("loads RMBG-1.4 (q8/wasm) and returns the cutout blob", async () => {
    const removeImageBackground = await importFresh();
    const result = await removeImageBackground(source);

    expect(result.blob).toBe(outputBlob);
    expect(autoModelMock.from_pretrained).toHaveBeenCalledWith(
      "briaai/RMBG-1.4",
      expect.objectContaining({ dtype: "q8", device: "wasm" }),
    );
    expect(envMock.allowLocalModels).toBe(false);
  });

  it("maps model-download progress to fetching, then ends with done", async () => {
    autoModelMock.from_pretrained.mockImplementation(
      async (_id: string, opts: FromPretrainedOpts) => {
        opts.progress_callback?.({ status: "progress", progress: 50 });
        return modelFn;
      },
    );

    const onProgress = vi.fn();
    const removeImageBackground = await importFresh();
    await removeImageBackground(source, { onProgress });

    expect(onProgress).toHaveBeenCalledWith({ stage: "fetching", fraction: 0.5 });
    expect(onProgress).toHaveBeenCalledWith({ stage: "computing", fraction: 0 });
    expect(onProgress).toHaveBeenLastCalledWith({ stage: "done", fraction: 1 });
  });

  it("throws AbortError when already aborted, without loading the model", async () => {
    const controller = new AbortController();
    controller.abort();

    const removeImageBackground = await importFresh();
    await expect(
      removeImageBackground(source, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(autoModelMock.from_pretrained).not.toHaveBeenCalled();
  });
});

describe("detectDevice", () => {
  async function importDetect() {
    return (await import("@/lib/image/background-removal")).detectDevice;
  }

  it("falls back to wasm when the browser has no WebGPU", async () => {
    const detectDevice = await importDetect();
    expect(await detectDevice()).toBe("wasm");
  });

  it("picks webgpu when an adapter is available", async () => {
    vi.stubGlobal("navigator", {
      gpu: { requestAdapter: async () => ({}) },
    });
    const detectDevice = await importDetect();
    expect(await detectDevice()).toBe("webgpu");
    vi.unstubAllGlobals();
  });

  it("falls back to wasm when no adapter is granted", async () => {
    vi.stubGlobal("navigator", {
      gpu: { requestAdapter: async () => null },
    });
    const detectDevice = await importDetect();
    expect(await detectDevice()).toBe("wasm");
    vi.unstubAllGlobals();
  });

  it("falls back to wasm when the adapter request throws", async () => {
    vi.stubGlobal("navigator", {
      gpu: {
        requestAdapter: async () => {
          throw new Error("denied");
        },
      },
    });
    const detectDevice = await importDetect();
    expect(await detectDevice()).toBe("wasm");
    vi.unstubAllGlobals();
  });
});

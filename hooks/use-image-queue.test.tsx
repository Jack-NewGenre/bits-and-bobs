import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { useImageQueue, type QueueProcessor } from "@/hooks/use-image-queue";

interface Result {
  blob: Blob;
}

let revokedUrls: string[];

function makeFile(name: string): File {
  return new File(["data"], name, { type: "image/png" });
}

beforeEach(() => {
  revokedUrls = [];
  let counter = 0;
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => {
      counter += 1;
      return `blob:queue-${counter}`;
    }),
    revokeObjectURL: vi.fn((url: string) => revokedUrls.push(url)),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** A processor that never settles until the test releases it. */
function pendingProcessor() {
  const signals: AbortSignal[] = [];
  const processor: QueueProcessor<Result> = (_file, _onProgress, signal) => {
    signals.push(signal);
    return new Promise<Result>(() => {});
  };
  return { processor, signals };
}

describe("useImageQueue", () => {
  it("measures the dropped file's natural size for every tool to use", async () => {
    const close = vi.fn();
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 800, height: 600, close })),
    );
    const processor: QueueProcessor<Result> = async () => ({
      blob: new Blob(["out"]),
    });

    const { result } = renderHook(() => useImageQueue(processor));
    act(() => result.current.addFiles([makeFile("a.png")]));

    await waitFor(() =>
      expect(result.current.items[0].sourceWidth).toBe(800),
    );
    expect(result.current.items[0].sourceHeight).toBe(600);
    // The decoded bitmap is released rather than left holding the pixels.
    expect(close).toHaveBeenCalled();
  });

  it("still processes a file whose size cannot be measured", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => {
        throw new Error("undecodable");
      }),
    );
    const processor: QueueProcessor<Result> = async () => ({
      blob: new Blob(["out"]),
    });

    const { result } = renderHook(() => useImageQueue(processor));
    act(() => result.current.addFiles([makeFile("a.png")]));

    await waitFor(() => expect(result.current.items[0].status).toBe("done"));
    expect(result.current.items[0].sourceWidth).toBeUndefined();
  });

  it("reports progress labels supplied by the processor", async () => {
    const processor: QueueProcessor<Result> = async (_file, onProgress) => {
      onProgress({ fraction: 0.4, label: "Loading model…" });
      return { blob: new Blob(["out"]) };
    };

    const { result } = renderHook(() => useImageQueue(processor));
    act(() => result.current.addFiles([makeFile("a.png")]));

    await waitFor(() => expect(result.current.items[0].status).toBe("done"));
    // Cleared once the item finishes, so the generic "Done" label shows.
    expect(result.current.items[0].progressLabel).toBeUndefined();
  });

  it("aborts in-flight work when an item is removed", async () => {
    const { processor, signals } = pendingProcessor();
    const { result } = renderHook(() => useImageQueue(processor));

    act(() => result.current.addFiles([makeFile("a.png")]));
    await waitFor(() => expect(signals).toHaveLength(1));

    const id = result.current.items[0].id;
    act(() => result.current.removeItem(id));

    expect(signals[0].aborted).toBe(true);
    expect(result.current.items).toHaveLength(0);
  });

  it("aborts every in-flight item and revokes its URLs when cleared", async () => {
    const { processor, signals } = pendingProcessor();
    const { result } = renderHook(() => useImageQueue(processor));

    act(() =>
      result.current.addFiles([makeFile("a.png"), makeFile("b.png")]),
    );
    await waitFor(() => expect(signals).toHaveLength(1));

    act(() => result.current.clear());

    expect(signals.every((signal) => signal.aborted)).toBe(true);
    // Both originals released.
    expect(revokedUrls).toHaveLength(2);
    expect(result.current.items).toHaveLength(0);
  });

  it("aborts outstanding work on unmount", async () => {
    const { processor, signals } = pendingProcessor();
    const { result, unmount } = renderHook(() => useImageQueue(processor));

    act(() => result.current.addFiles([makeFile("a.png")]));
    await waitFor(() => expect(signals).toHaveLength(1));

    act(() => unmount());
    expect(signals[0].aborted).toBe(true);
  });

  it("retries a failed item and clears the error", async () => {
    let attempt = 0;
    const processor: QueueProcessor<Result> = async () => {
      attempt += 1;
      if (attempt === 1) throw new Error("Model unavailable");
      return { blob: new Blob(["out"]) };
    };

    const { result } = renderHook(() => useImageQueue(processor));
    act(() => result.current.addFiles([makeFile("a.png")]));
    await waitFor(() => expect(result.current.items[0].status).toBe("error"));

    act(() => result.current.retryItem(result.current.items[0].id));

    await waitFor(() => expect(result.current.items[0].status).toBe("done"));
    expect(result.current.items[0].error).toBeUndefined();
    expect(attempt).toBe(2);
  });

  it("ignores a retry for an item that did not fail", async () => {
    const processor = vi.fn(async () => ({ blob: new Blob(["out"]) }));
    const { result } = renderHook(() => useImageQueue(processor));

    act(() => result.current.addFiles([makeFile("a.png")]));
    await waitFor(() => expect(result.current.items[0].status).toBe("done"));

    act(() => result.current.retryItem(result.current.items[0].id));
    expect(processor).toHaveBeenCalledTimes(1);
  });

  it("surfaces a failed pass as an error item", async () => {
    const processor: QueueProcessor<Result> = async () => {
      throw new Error("Model unavailable");
    };

    const { result } = renderHook(() => useImageQueue(processor));
    act(() => result.current.addFiles([makeFile("a.png")]));

    await waitFor(() => expect(result.current.items[0].status).toBe("error"));
    expect(result.current.items[0].error).toBe("Model unavailable");
  });

  it("reorders items, which is the output order for some tools", async () => {
    const processor: QueueProcessor<Result> = async () => ({
      blob: new Blob(["out"]),
    });
    const { result } = renderHook(() => useImageQueue(processor));

    act(() =>
      result.current.addFiles([
        makeFile("a.png"),
        makeFile("b.png"),
        makeFile("c.png"),
      ]),
    );
    await waitFor(() => expect(result.current.items).toHaveLength(3));

    act(() => result.current.moveItem(result.current.items[2].id, -1));
    expect(result.current.items.map((item) => item.name)).toEqual([
      "a.png",
      "c.png",
      "b.png",
    ]);
  });

  it("will not move an item past either end", async () => {
    const processor: QueueProcessor<Result> = async () => ({
      blob: new Blob(["out"]),
    });
    const { result } = renderHook(() => useImageQueue(processor));

    act(() => result.current.addFiles([makeFile("a.png"), makeFile("b.png")]));
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    act(() => result.current.moveItem(result.current.items[0].id, -1));
    act(() => result.current.moveItem(result.current.items[1].id, 1));
    expect(result.current.items.map((item) => item.name)).toEqual([
      "a.png",
      "b.png",
    ]);
  });
});

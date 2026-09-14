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

describe("concurrency", () => {
  /** A processor whose jobs are released one at a time, by name. */
  function gatedProcessor() {
    const started: string[] = [];
    const release = new Map<string, () => void>();
    const processor: QueueProcessor<Result> = (file) => {
      started.push(file.name);
      return new Promise<Result>((resolve) => {
        release.set(file.name, () => resolve({ blob: new Blob(["out"]) }));
      });
    };
    return { processor, started, release };
  }

  it("runs one at a time by default", async () => {
    const { processor, started, release } = gatedProcessor();
    const { result } = renderHook(() => useImageQueue(processor));

    act(() => {
      result.current.addFiles([makeFile("a.png"), makeFile("b.png")]);
    });

    await waitFor(() => expect(started).toEqual(["a.png"]));
    // The second only begins once the first is out of the way.
    await act(async () => release.get("a.png")?.());
    await waitFor(() => expect(started).toEqual(["a.png", "b.png"]));
  });

  it("opens as many lanes as the limit allows", async () => {
    const { processor, started, release } = gatedProcessor();
    const { result } = renderHook(() =>
      useImageQueue(processor, { concurrency: () => 3 }),
    );

    act(() => {
      result.current.addFiles(
        ["a.png", "b.png", "c.png", "d.png"].map(makeFile),
      );
    });

    // Three run together; the fourth waits for a lane to come free.
    await waitFor(() =>
      expect(started).toEqual(["a.png", "b.png", "c.png"]),
    );

    await act(async () => release.get("b.png")?.());
    await waitFor(() =>
      expect(started).toEqual(["a.png", "b.png", "c.png", "d.png"]),
    );
  });

  it("does not exceed the limit when a second batch is dropped mid-run", async () => {
    const { processor, started } = gatedProcessor();
    const { result } = renderHook(() =>
      useImageQueue(processor, { concurrency: () => 2 }),
    );

    act(() => {
      result.current.addFiles([makeFile("a.png"), makeFile("b.png")]);
    });
    await waitFor(() => expect(started).toHaveLength(2));

    act(() => {
      result.current.addFiles([makeFile("c.png"), makeFile("d.png")]);
    });
    // Still two in flight: the new files join the queue, they do not
    // open lanes of their own.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(started).toEqual(["a.png", "b.png"]);
  });

  it("never picks up an item removed while it was waiting", async () => {
    const { processor, started, release } = gatedProcessor();
    const { result } = renderHook(() => useImageQueue(processor));

    act(() => {
      result.current.addFiles([makeFile("a.png"), makeFile("b.png")]);
    });
    await waitFor(() => expect(started).toEqual(["a.png"]));

    const queued = result.current.items[1];
    act(() => result.current.removeItem(queued.id));
    await act(async () => release.get("a.png")?.());

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(started).toEqual(["a.png"]);
  });
});

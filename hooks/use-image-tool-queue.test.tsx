import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import {
  useImageToolQueue,
  type DownloadAllOptions,
} from "@/hooks/use-image-tool-queue";

const downloadZip = vi.fn();

vi.mock("@/lib/zip", () => ({
  downloadZip: (...args: unknown[]) => downloadZip(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    loading: vi.fn(() => "toast"),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

interface Settings {
  quality: number;
}

interface Result {
  blob: Blob;
}

const DEFAULTS: Settings = { quality: 80 };

/** The blob the queue's own pass produces for every item. */
const QUEUED_BLOB = new Blob(["queued"], { type: "image/png" });
const REBUILT_BLOB = new Blob(["rebuilt"], { type: "image/png" });

let built: { name: string; cached: boolean }[];

const buildEntry: DownloadAllOptions<Settings, Result>["buildEntry"] = async (
  item,
  _settings,
  cached,
) => {
  built.push({ name: item.name, cached: cached !== undefined });
  return { name: item.name, blob: cached ?? REBUILT_BLOB };
};

function makeFile(name: string): File {
  return new File(["data"], name, { type: "image/png" });
}

function setup(concurrency?: () => number) {
  return renderHook(() =>
    useImageToolQueue<Settings, Result>({
      processor: async () => ({ blob: QUEUED_BLOB }),
      defaultSettings: DEFAULTS,
      processingLabel: "Working…",
      concurrency,
      downloadAll: {
        actionLabel: "Preparing",
        zipFilename: "out.zip",
        buildEntry,
      },
    }),
  );
}

/** The entries handed to the zip on the most recent download. */
const zipped = () =>
  downloadZip.mock.lastCall?.[0] as { name: string; blob: Blob }[];

beforeEach(() => {
  built = [];
  downloadZip.mockReset().mockResolvedValue(undefined);
  let counter = 0;
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => `blob:tool-${(counter += 1)}`),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function withTwoDoneItems(concurrency?: () => number) {
  const hook = setup(concurrency);
  act(() => {
    hook.result.current.addFiles([makeFile("a.png"), makeFile("b.png")]);
  });
  await waitFor(() => expect(hook.result.current.doneItems).toHaveLength(2));
  return hook;
}

describe("useImageToolQueue download all", () => {
  it("reuses the queue's own output while the settings are untouched", async () => {
    const { result } = await withTwoDoneItems();

    await act(async () => result.current.handleDownloadAll());

    expect(built.every((entry) => entry.cached)).toBe(true);
    expect(zipped().map((entry) => entry.blob)).toEqual([
      QUEUED_BLOB,
      QUEUED_BLOB,
    ]);
  });

  it("re-processes once the settings have moved", async () => {
    const { result } = await withTwoDoneItems();

    act(() => result.current.setSettings({ quality: 40 }));
    await act(async () => result.current.handleDownloadAll());

    // Nothing cached is offered, so the zip cannot contain a file that no
    // longer matches the controls on screen.
    expect(built.every((entry) => entry.cached)).toBe(false);
    expect(zipped().map((entry) => entry.blob)).toEqual([
      REBUILT_BLOB,
      REBUILT_BLOB,
    ]);
  });

  it("offers the cache again when the settings are put back", async () => {
    const { result } = await withTwoDoneItems();

    act(() => result.current.setSettings({ quality: 40 }));
    act(() => result.current.setSettings({ quality: 80 }));
    await act(async () => result.current.handleDownloadAll());

    expect(built.every((entry) => entry.cached)).toBe(true);
  });

  it("keeps the zip in queue order however the entries are built", async () => {
    const { result } = await withTwoDoneItems(() => 4);

    act(() => result.current.setSettings({ quality: 40 }));
    await act(async () => result.current.handleDownloadAll());

    expect(zipped().map((entry) => entry.name)).toEqual(["a.png", "b.png"]);
  });
});

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { useLiveResult } from "@/hooks/use-live-result";

interface Settings {
  strength: number;
}

const SEED_URL = "blob:seed";

// Settings must be referentially stable, as they are in the real callers.
const FIRST: Settings = { strength: 1 };
const SECOND: Settings = { strength: 2 };

function makeResult(label: string) {
  return { blob: new Blob([label], { type: "image/png" }) };
}

let createdUrls: string[];
let revokedUrls: string[];

beforeEach(() => {
  createdUrls = [];
  revokedUrls = [];
  let counter = 0;
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => {
      counter += 1;
      const url = `blob:live-${counter}`;
      createdUrls.push(url);
      return url;
    }),
    revokeObjectURL: vi.fn((url: string) => revokedUrls.push(url)),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useLiveResult", () => {
  it("reuses the queue's first pass instead of processing again", async () => {
    const process = vi.fn(async () => makeResult("fresh"));
    const seedResult = makeResult("seed");

    const { result } = renderHook(() =>
      useLiveResult<string, Settings, { blob: Blob }>({
        source: "file",
        settings: FIRST,
        process,
        seed: { result: seedResult, url: SEED_URL, matches: true },
        debounceMs: 0,
      }),
    );

    expect(result.current.result).toBe(seedResult);
    expect(result.current.url).toBe(SEED_URL);
    expect(result.current.isProcessing).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(process).not.toHaveBeenCalled();
  });

  it("processes once the settings no longer match the seed", async () => {
    const process = vi.fn(async () => makeResult("fresh"));
    const seedResult = makeResult("seed");

    const { result, rerender } = renderHook(
      ({ settings, matches }: { settings: Settings; matches: boolean }) =>
        useLiveResult<string, Settings, { blob: Blob }>({
          source: "file",
          settings,
          process,
          seed: { result: seedResult, url: SEED_URL, matches },
          debounceMs: 0,
        }),
      { initialProps: { settings: FIRST, matches: true } },
    );

    expect(process).not.toHaveBeenCalled();

    rerender({ settings: SECOND, matches: false });
    await waitFor(() => expect(result.current.url).toBe(createdUrls[0]));

    expect(process).toHaveBeenCalledTimes(1);
    // The seed URL belongs to the queue and must survive.
    expect(revokedUrls).not.toContain(SEED_URL);
  });

  it("keeps showing the seeded result until the first live pass lands", async () => {
    const seedResult = makeResult("seed");
    let release: (value: { blob: Blob }) => void = () => {};
    const process = vi.fn(
      () => new Promise<{ blob: Blob }>((resolve) => (release = resolve)),
    );

    const { result } = renderHook(() =>
      useLiveResult<string, Settings, { blob: Blob }>({
        source: "file",
        settings: SECOND,
        process,
        seed: { result: seedResult, url: SEED_URL, matches: false },
        debounceMs: 0,
      }),
    );

    await waitFor(() => expect(process).toHaveBeenCalledTimes(1));
    expect(result.current.result).toBe(seedResult);
    expect(result.current.url).toBe(SEED_URL);

    const fresh = makeResult("fresh");
    await act(async () => release(fresh));
    expect(result.current.result).toBe(fresh);
  });

  it("revokes only the URLs it created, on unmount", async () => {
    const process = vi.fn(async () => makeResult("fresh"));

    const { result, unmount } = renderHook(() =>
      useLiveResult<string, Settings, { blob: Blob }>({
        source: "file",
        settings: FIRST,
        process,
        seed: { result: makeResult("seed"), url: SEED_URL, matches: false },
        debounceMs: 0,
      }),
    );

    await waitFor(() => expect(createdUrls).toHaveLength(1));
    expect(result.current.url).toBe(createdUrls[0]);
    act(() => unmount());

    expect(revokedUrls).toEqual(createdUrls);
    expect(revokedUrls).not.toContain(SEED_URL);
  });

  it("shows the cheap preview first, then replaces it with the full pass", async () => {
    const preview = makeResult("preview");
    const full = makeResult("full");
    let releaseFull: (value: { blob: Blob }) => void = () => {};
    const previewProcess = vi.fn(async () => preview);
    const process = vi.fn(
      () => new Promise<{ blob: Blob }>((resolve) => (releaseFull = resolve)),
    );

    const { result } = renderHook(() =>
      useLiveResult<string, Settings, { blob: Blob }>({
        source: "file",
        settings: FIRST,
        process,
        previewProcess,
        debounceMs: 0,
      }),
    );

    await waitFor(() => expect(result.current.result).toBe(preview));
    // A preview is a stand-in, so it must announce itself as one.
    expect(result.current.isPreview).toBe(true);
    expect(result.current.isProcessing).toBe(true);

    await act(async () => releaseFull(full));

    expect(result.current.result).toBe(full);
    expect(result.current.isPreview).toBe(false);
    expect(result.current.isProcessing).toBe(false);
    expect(previewProcess).toHaveBeenCalledTimes(1);
  });

  it("revokes the preview URL as well as the final one", async () => {
    const previewProcess = vi.fn(async () => makeResult("preview"));
    const process = vi.fn(async () => makeResult("full"));

    const { result, unmount } = renderHook(() =>
      useLiveResult<string, Settings, { blob: Blob }>({
        source: "file",
        settings: FIRST,
        process,
        previewProcess,
        debounceMs: 0,
      }),
    );

    await waitFor(() => expect(result.current.isPreview).toBe(false));
    expect(createdUrls).toHaveLength(2);

    act(() => unmount());
    expect(revokedUrls).toEqual(createdUrls);
  });

  it("aborts an in-flight pass when the settings change again", async () => {
    const signals: AbortSignal[] = [];
    const process = vi.fn(
      (
        _source: string,
        _settings: Settings,
        { signal }: { signal: AbortSignal },
      ) => {
        signals.push(signal);
        return new Promise<{ blob: Blob }>((resolve) =>
          setTimeout(() => resolve(makeResult("slow")), 50),
        );
      },
    );

    const { rerender } = renderHook(
      ({ settings }: { settings: Settings }) =>
        useLiveResult<string, Settings, { blob: Blob }>({
          source: "file",
          settings,
          process,
          debounceMs: 0,
        }),
      { initialProps: { settings: FIRST } },
    );

    await waitFor(() => expect(signals).toHaveLength(1));
    rerender({ settings: SECOND });

    expect(signals[0].aborted).toBe(true);
  });
});

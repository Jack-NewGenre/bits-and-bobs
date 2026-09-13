import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useCopy } from "@/hooks/use-copy";

const writeText = vi.fn();
const execCommand = vi.fn();

beforeEach(() => {
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
  Object.defineProperty(document, "execCommand", {
    value: execCommand,
    configurable: true,
    writable: true,
  });
  writeText.mockReset().mockResolvedValue(undefined);
  execCommand.mockReset().mockReturnValue(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useCopy", () => {
  it("uses the clipboard API when it is allowed", async () => {
    const { result } = renderHook(() => useCopy());

    await act(async () => {
      expect(await result.current.copy("hello")).toBe(true);
    });

    expect(writeText).toHaveBeenCalledWith("hello");
    expect(execCommand).not.toHaveBeenCalled();
    expect(result.current.copied).toBe(true);
  });

  it("falls back to a selection when the browser refuses", async () => {
    writeText.mockRejectedValue(new DOMException("nope", "NotAllowedError"));
    const { result } = renderHook(() => useCopy());

    await act(async () => {
      expect(await result.current.copy("hello")).toBe(true);
    });

    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(result.current.copied).toBe(true);
  });

  it("reports failure when neither route works", async () => {
    writeText.mockRejectedValue(new Error("nope"));
    execCommand.mockReturnValue(false);
    const { result } = renderHook(() => useCopy());

    await act(async () => {
      expect(await result.current.copy("hello")).toBe(false);
    });

    // No false reassurance: the tick must not appear.
    expect(result.current.copied).toBe(false);
  });

  it("leaves no stray field behind after the fallback", async () => {
    writeText.mockRejectedValue(new Error("nope"));
    const { result } = renderHook(() => useCopy());

    await act(async () => {
      await result.current.copy("hello");
    });

    expect(document.querySelectorAll("textarea")).toHaveLength(0);
  });

  it("clears the confirmation after the reset delay", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCopy(50));

    await act(async () => {
      await result.current.copy("hello");
    });
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(result.current.copied).toBe(false);
  });
});

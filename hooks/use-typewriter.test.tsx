import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { HOLD_MS, TYPE_MS, useTypewriter } from "@/hooks/use-typewriter";

const LINES = ["ab", "cd"];

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const advance = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
};

/** Each tick schedules the next after a render, so step through them one at a time. */
const typeOut = async (characters: number) => {
  for (let step = 0; step < characters; step++) await advance(TYPE_MS);
};

describe("useTypewriter", () => {
  it("types a line out one character at a time", async () => {
    const { result } = renderHook(() => useTypewriter(LINES));
    expect(result.current).toBe("");
    await advance(TYPE_MS);
    expect(result.current).toBe("a");
    await advance(TYPE_MS);
    expect(result.current).toBe("ab");
  });

  it("holds a finished line, then starts the next", async () => {
    const { result } = renderHook(() => useTypewriter(LINES));
    await typeOut(2);
    await advance(HOLD_MS - 1);
    expect(result.current).toBe("ab");
    await advance(1);
    expect(result.current).toBe("");
    await advance(TYPE_MS);
    expect(result.current).toBe("c");
  });

  it("wraps round to the first line", async () => {
    const { result } = renderHook(() => useTypewriter(LINES));
    for (let step = 0; step < 2; step++) {
      await typeOut(2);
      await advance(HOLD_MS);
    }
    await advance(TYPE_MS);
    expect(result.current).toBe("a");
  });

  it("stops while paused", async () => {
    const { result, rerender } = renderHook(({ paused }) => useTypewriter(LINES, paused), {
      initialProps: { paused: false },
    });
    await advance(TYPE_MS);
    rerender({ paused: true });
    await typeOut(5);
    expect(result.current).toBe("a");
  });

  it("shows the first line whole when motion is reduced", async () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    const { result } = renderHook(() => useTypewriter(LINES));
    expect(result.current).toBe("ab");
    await typeOut(5);
    expect(result.current).toBe("ab");
  });
});

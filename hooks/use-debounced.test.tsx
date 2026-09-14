import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useDebounced } from "@/hooks/use-debounced";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const advance = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
};

describe("useDebounced", () => {
  it("hands back the first value straight away", () => {
    const { result } = renderHook(() => useDebounced("first"));
    expect(result.current).toBe("first");
  });

  it("holds a change back until the delay has passed", async () => {
    const { result, rerender } = renderHook(({ value }) => useDebounced(value), {
      initialProps: { value: "a" },
    });

    rerender({ value: "b" });
    expect(result.current).toBe("a");

    await advance(149);
    expect(result.current).toBe("a");

    await advance(1);
    expect(result.current).toBe("b");
  });

  it("collapses a burst of changes into the last one", async () => {
    const { result, rerender } = renderHook(({ value }) => useDebounced(value), {
      initialProps: { value: "" },
    });

    for (const value of ["a", "ab", "abc", "abcd"]) {
      rerender({ value });
      await advance(50);
    }

    // Every change so far has been superseded before it could settle.
    expect(result.current).toBe("");

    await advance(150);
    expect(result.current).toBe("abcd");
  });

  it("honours a custom delay", async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounced(value, 500),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "b" });
    await advance(200);
    expect(result.current).toBe("a");

    await advance(300);
    expect(result.current).toBe("b");
  });

  it("works on object references, not just primitives", async () => {
    const first = { count: 1 };
    const second = { count: 2 };
    const { result, rerender } = renderHook(({ value }) => useDebounced(value), {
      initialProps: { value: first },
    });

    rerender({ value: second });
    expect(result.current).toBe(first);

    await advance(150);
    expect(result.current).toBe(second);
  });
});

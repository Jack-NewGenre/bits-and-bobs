import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useCutRegions } from "@/hooks/use-cut-regions";

const box = (x: number) => ({ x, y: 0, width: 10, height: 10 });

describe("useCutRegions", () => {
  it("adds a box and selects it", () => {
    const { result } = renderHook(() => useCutRegions());

    act(() => result.current.add(box(0)));
    act(() => result.current.add(box(20)));

    expect(result.current.regions).toEqual([
      { ...box(0), id: 1 },
      { ...box(20), id: 2 },
    ]);
    expect(result.current.selectedId).toBe(2);
  });

  it("updates one box by id", () => {
    const { result } = renderHook(() => useCutRegions());
    act(() => result.current.replace([box(0), box(20)]));

    act(() => result.current.update(2, box(50)));

    expect(result.current.regions).toEqual([
      { ...box(0), id: 1 },
      { ...box(50), id: 2 },
    ]);
  });

  it("drops the selection along with the selected box", () => {
    const { result } = renderHook(() => useCutRegions());
    act(() => result.current.replace([box(0), box(20)]));
    act(() => result.current.select(1));

    act(() => result.current.remove(2));
    expect(result.current.selectedId).toBe(1);

    act(() => result.current.remove(1));
    expect(result.current.regions).toEqual([]);
    expect(result.current.selectedId).toBeNull();
  });

  it("gives replaced boxes fresh ids and clears the selection", () => {
    const { result } = renderHook(() => useCutRegions());
    act(() => result.current.add(box(0)));

    act(() => result.current.replace([box(5)]));

    expect(result.current.regions).toEqual([{ ...box(5), id: 2 }]);
    expect(result.current.selectedId).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import {
  brushSoftness,
  DEFAULT_TOOL_STYLE,
  selectionModeFor,
  toggleVariant,
} from "@/lib/image/editor/tool-style";

describe("tool style", () => {
  it("softens a brush's edge as its hardness drops", () => {
    expect(brushSoftness(40, 100)).toBe(0);
    expect(brushSoftness(40, 50)).toBe(10);
    expect(brushSoftness(40, 0)).toBe(20);
    expect(brushSoftness(40, 150)).toBe(0);
  });

  it("adds with shift and subtracts with alt", () => {
    const keys = { shiftKey: false, altKey: false };
    expect(selectionModeFor("replace", keys)).toBe("replace");
    expect(selectionModeFor("replace", { ...keys, shiftKey: true })).toBe(
      "add",
    );
    expect(selectionModeFor("add", { ...keys, altKey: true })).toBe("subtract");
  });

  it("flips marquee, lasso and dodge/burn to their other kind", () => {
    const style = DEFAULT_TOOL_STYLE;
    expect(toggleVariant("marquee", style)).toEqual({ marquee: "ellipse" });
    expect(toggleVariant("lasso", { ...style, lasso: "magnetic" })).toEqual({
      lasso: "freehand",
    });
    expect(toggleVariant("tone", style)).toEqual({ tone: "burn" });
    expect(toggleVariant("brush", style)).toEqual({});
  });
});

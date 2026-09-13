import { describe, expect, it } from "vitest";

import { clamp, formatBytes, percentSmaller, shallowEqual } from "@/lib/utils";

describe("clamp", () => {
  it("constrains to the inclusive range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(50, 0, 10)).toBe(10);
  });
});

describe("formatBytes", () => {
  it("scales through the units", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("shallowEqual", () => {
  it("treats the same reference as equal", () => {
    const settings = { mode: "color", colors: 16 };
    expect(shallowEqual(settings, settings)).toBe(true);
  });

  it("compares values, not identity", () => {
    expect(shallowEqual({ a: 1, b: "x" }, { a: 1, b: "x" })).toBe(true);
    expect(shallowEqual({ a: 1, b: "x" }, { a: 2, b: "x" })).toBe(false);
  });

  it("is false when the key counts differ", () => {
    expect(
      shallowEqual<Record<string, unknown>>({ a: 1 }, { a: 1, b: undefined }),
    ).toBe(false);
  });
});

describe("percentSmaller", () => {
  it("reports a saving as a positive percentage", () => {
    expect(percentSmaller(1000, 250)).toBe(75);
    expect(percentSmaller(1000, 900)).toBe(10);
  });

  it("reports growth as a negative percentage", () => {
    expect(percentSmaller(1000, 1500)).toBe(-50);
  });

  it("is zero for no change, and for an empty input", () => {
    expect(percentSmaller(1000, 1000)).toBe(0);
    expect(percentSmaller(0, 500)).toBe(0);
  });
});

describe("percentSmaller clamped", () => {
  it("floors a size increase at zero when asked", () => {
    expect(percentSmaller(1000, 1500, { clampToZero: true })).toBe(0);
    expect(percentSmaller(1000, 250, { clampToZero: true })).toBe(75);
  });
});

import { describe, expect, it } from "vitest";

import { unsharpMask } from "@/lib/image/unsharp";

describe("unsharpMask", () => {
  it("leaves flat regions unchanged", () => {
    const base = new Uint8ClampedArray([100, 100, 100, 255]);
    const blurred = new Uint8ClampedArray([100, 100, 100, 255]);
    expect(Array.from(unsharpMask(base, blurred, 1))).toEqual([
      100, 100, 100, 255,
    ]);
  });

  it("boosts pixels brighter than their blurred neighbourhood", () => {
    const base = new Uint8ClampedArray([200, 200, 200, 255]);
    const blurred = new Uint8ClampedArray([150, 150, 150, 255]);
    // 200 + 1 * (200 - 150) = 250
    expect(unsharpMask(base, blurred, 1)[0]).toBe(250);
  });

  it("sharpens the alpha channel too (for transparent line-art)", () => {
    const base = new Uint8ClampedArray([0, 0, 0, 200]);
    const blurred = new Uint8ClampedArray([0, 0, 0, 150]);
    // alpha: 200 + 1 * (200 - 150) = 250
    expect(unsharpMask(base, blurred, 1)[3]).toBe(250);
  });

  it("scales strength with the amount", () => {
    const base = new Uint8ClampedArray([160, 0, 0, 255]);
    const blurred = new Uint8ClampedArray([140, 0, 0, 255]);
    // 160 + 0.5 * (160 - 140) = 170
    expect(unsharpMask(base, blurred, 0.5)[0]).toBe(170);
  });

  it("writes in place to avoid a second full-size buffer", () => {
    const base = new Uint8ClampedArray([200, 200, 200, 255]);
    const blurred = new Uint8ClampedArray([150, 150, 150, 255]);
    const out = unsharpMask(base, blurred, 1);
    expect(out).toBe(base);
    expect(base[0]).toBe(250);
  });

  it("clamps to the byte range", () => {
    const base = new Uint8ClampedArray([255, 0, 0, 255]);
    const blurred = new Uint8ClampedArray([100, 50, 0, 255]);
    const out = unsharpMask(base, blurred, 2);
    expect(out[0]).toBe(255); // 255 + 2*155 -> clamp high
    expect(out[1]).toBe(0); // 0 + 2*(0-50) -> clamp low
  });
});

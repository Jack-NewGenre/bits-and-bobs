import { describe, expect, it } from "vitest";

import {
  computeBox,
  computeDrawRect,
  DEFAULT_TRANSFORM_SETTINGS,
  MAX_OUTPUT_DIM,
} from "@/lib/transform";

const base = DEFAULT_TRANSFORM_SETTINGS;

describe("computeBox", () => {
  it("uses the scale percentage when no box is given", () => {
    expect(computeBox(400, 200, { ...base, scale: 50 })).toEqual({
      width: 200,
      height: 100,
    });
    expect(computeBox(400, 200, { ...base, scale: 200 })).toEqual({
      width: 800,
      height: 400,
    });
  });

  it("follows the aspect ratio when only one side is given", () => {
    expect(computeBox(400, 200, { ...base, width: 100 })).toEqual({
      width: 100,
      height: 50,
    });
    expect(computeBox(400, 200, { ...base, height: 100 })).toEqual({
      width: 200,
      height: 100,
    });
  });

  it("takes both sides literally when both are given", () => {
    expect(computeBox(400, 200, { ...base, width: 123, height: 456 })).toEqual({
      width: 123,
      height: 456,
    });
  });

  it("never returns a zero dimension", () => {
    expect(computeBox(400, 200, { ...base, scale: 1 })).toEqual({
      width: 4,
      height: 2,
    });
    expect(computeBox(10, 10, { ...base, width: 0, scale: 1 })).toMatchObject({
      width: 1,
      height: 1,
    });
  });

  it("clamps to the maximum edge, keeping the aspect ratio", () => {
    const box = computeBox(4000, 2000, { ...base, scale: 1000 });
    expect(Math.max(box.width, box.height)).toBe(MAX_OUTPUT_DIM);
    expect(box.width / box.height).toBeCloseTo(2, 3);
  });
});

describe("computeDrawRect", () => {
  it("fits the whole image inside the box for contain", () => {
    const rect = computeDrawRect(400, 200, 100, 100, "contain");
    expect(rect).toEqual({ x: 0, y: 25, width: 100, height: 50 });
  });

  it("fills the box and lets the overflow crop for cover", () => {
    const rect = computeDrawRect(400, 200, 100, 100, "cover");
    expect(rect).toEqual({ x: -50, y: 0, width: 200, height: 100 });
  });

  it("distorts to fit exactly for stretch", () => {
    expect(computeDrawRect(400, 200, 100, 100, "stretch")).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });
  });

  it("centres whatever it draws", () => {
    const contain = computeDrawRect(200, 400, 100, 100, "contain");
    expect(contain.x + contain.width / 2).toBeCloseTo(50, 6);

    const cover = computeDrawRect(200, 400, 100, 100, "cover");
    expect(cover.y + cover.height / 2).toBeCloseTo(50, 6);
  });

  it("leaves a matching aspect ratio untouched under every mode", () => {
    for (const fit of ["contain", "cover", "stretch"] as const) {
      expect(computeDrawRect(200, 100, 400, 200, fit)).toEqual({
        x: 0,
        y: 0,
        width: 400,
        height: 200,
      });
    }
  });
});

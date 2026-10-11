import { describe, expect, it } from "vitest";

import {
  buildFilters,
  colourBalanceMatrix,
  DEFAULT_ADJUSTMENTS,
  isNeutral,
  levelsMatrix,
  midtonesGamma,
  sharpenKernel,
  withDefaults,
} from "@/lib/image/editor/adjustments";

const typesOf = (adjustments: Parameters<typeof buildFilters>[0]) =>
  buildFilters(adjustments).map((filter) => filter.type);

describe("image adjustments", () => {
  it("builds no filters for an untouched image", () => {
    expect(isNeutral(DEFAULT_ADJUSTMENTS)).toBe(true);
    expect(buildFilters(DEFAULT_ADJUSTMENTS)).toEqual([]);
  });

  it("only builds the filters that change something", () => {
    expect(
      typesOf({ ...DEFAULT_ADJUSTMENTS, brightness: 20, invert: true }),
    ).toEqual(["Brightness", "Invert"]);
  });

  it("maps sliders onto Fabric's ranges", () => {
    const [brightness, hue] = buildFilters({
      ...DEFAULT_ADJUSTMENTS,
      brightness: 50,
      hue: 90,
    });
    expect(brightness.toObject()).toMatchObject({ brightness: 0.5 });
    expect(hue.toObject()).toMatchObject({ rotation: 0.5 });
  });

  it("needs a block size above one before pixelating", () => {
    expect(typesOf({ ...DEFAULT_ADJUSTMENTS, pixelate: 1 })).toEqual([]);
    expect(isNeutral({ ...DEFAULT_ADJUSTMENTS, pixelate: 1 })).toBe(false);
  });

  it("fills in adjustments saved before newer ones existed", () => {
    expect(withDefaults({ brightness: 10 })).toEqual({
      ...DEFAULT_ADJUSTMENTS,
      brightness: 10,
    });
    expect(typesOf({ brightness: 10 })).toEqual(["Brightness"]);
  });

  it("builds levels, colour balance, midtones and sharpening", () => {
    expect(
      typesOf({
        ...DEFAULT_ADJUSTMENTS,
        blackPoint: 10,
        midtones: 20,
        temperature: 30,
        sharpen: 40,
      }),
    ).toEqual(["ColorMatrix", "Gamma", "ColorMatrix", "Convolute"]);
  });

  it("builds a curve and per-colour hue filter only when they change something", () => {
    expect(
      typesOf({
        ...DEFAULT_ADJUSTMENTS,
        curve: [
          { x: 0, y: 0 },
          { x: 0.5, y: 0.5 },
          { x: 1, y: 1 },
        ],
      }),
    ).toEqual([]);
    expect(
      typesOf({
        ...DEFAULT_ADJUSTMENTS,
        curve: [
          { x: 0, y: 0 },
          { x: 0.5, y: 0.7 },
          { x: 1, y: 1 },
        ],
        colourRanges: {
          ...DEFAULT_ADJUSTMENTS.colourRanges,
          blues: { hue: 0, saturation: 40, lightness: 0 },
        },
      }),
    ).toEqual(["SmudgeCurve", "SmudgeHueRange"]);
  });

  it("fills in colour ranges missing from an older save", () => {
    const { colourRanges } = withDefaults({
      colourRanges: { reds: { hue: 10, saturation: 0, lightness: 0 } },
    });
    expect(colourRanges.reds.hue).toBe(10);
    expect(colourRanges.blues).toEqual({ hue: 0, saturation: 0, lightness: 0 });
  });

  it("stretches the levels range to fill black to white", () => {
    const m = levelsMatrix(51, 255);
    // A pixel at the black point lands on 0, the white point on 255.
    expect(51 * m[0] + m[4] * 255).toBeCloseTo(0);
    expect(255 * m[0] + m[4] * 255).toBeCloseTo(255);
  });

  it("warms by lifting red and lowering blue", () => {
    const m = colourBalanceMatrix(100, 0);
    expect(m[4]).toBeGreaterThan(0);
    expect(m[14]).toBeLessThan(0);
  });

  it("lifts midtones with a gamma above one and sharpens around the centre", () => {
    expect(midtonesGamma(0)).toBe(1);
    expect(midtonesGamma(50)).toBe(2);
    expect(sharpenKernel(100).reduce((sum, v) => sum + v, 0)).toBeCloseTo(1);
  });
});

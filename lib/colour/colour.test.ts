import { describe, expect, it } from "vitest";

import {
  gamutMapOklch,
  isInSrgbGamut,
  oklchToRgbInGamut,
  hslToRgb,
  linearToSrgb,
  oklchToRgb,
  rgbToHsl,
  rgbToOklch,
  srgbToLinear,
} from "@/lib/colour/colour";
import {
  formatHex,
  formatHsl,
  formatOklch,
  formatRgb,
  parseColour,
} from "@/lib/colour/colour-format";

const RED = { r: 255, g: 0, b: 0, a: 1 };
const WHITE = { r: 255, g: 255, b: 255, a: 1 };
const BLACK = { r: 0, g: 0, b: 0, a: 1 };

describe("parseColour", () => {
  it("reads hex in every length", () => {
    expect(parseColour("#f00")).toEqual(RED);
    expect(parseColour("#ff0000")).toEqual(RED);
    expect(parseColour("ff0000")).toEqual(RED);
    expect(parseColour("#ff000080")).toMatchObject({ r: 255, g: 0, b: 0 });
    expect(parseColour("#ff000080")!.a).toBeCloseTo(0.5, 1);
  });

  it("reads rgb() with commas, spaces and an alpha", () => {
    expect(parseColour("rgb(255, 0, 0)")).toEqual(RED);
    expect(parseColour("rgb(255 0 0)")).toEqual(RED);
    expect(parseColour("rgba(255, 0, 0, 0.5)")).toEqual({ ...RED, a: 0.5 });
    expect(parseColour("rgb(255 0 0 / 50%)")).toEqual({ ...RED, a: 0.5 });
  });

  it("reads hsl() and oklch()", () => {
    expect(parseColour("hsl(0 100% 50%)")).toEqual(RED);
    expect(parseColour("oklch(100% 0 0)")).toEqual(WHITE);
  });

  it("returns undefined for anything it cannot read", () => {
    expect(parseColour("")).toBeUndefined();
    expect(parseColour("not a colour")).toBeUndefined();
    expect(parseColour("#ff")).toBeUndefined();
    expect(parseColour("#fffff")).toBeUndefined();
  });

  it("clamps out-of-range channels rather than producing nonsense", () => {
    expect(parseColour("rgb(300, -20, 0)")).toEqual({
      r: 255,
      g: 0,
      b: 0,
      a: 1,
    });
  });
});

describe("formatting", () => {
  it("writes hex, dropping a fully opaque alpha", () => {
    expect(formatHex(RED)).toBe("#ff0000");
    expect(formatHex({ ...RED, a: 0.5 })).toBe("#ff000080");
  });

  it("writes modern rgb(), hsl() and oklch()", () => {
    expect(formatRgb(RED)).toBe("rgb(255 0 0)");
    expect(formatRgb({ ...RED, a: 0.5 })).toBe("rgb(255 0 0 / 0.5)");
    expect(formatHsl(RED)).toBe("hsl(0 100% 50%)");
    expect(formatOklch(WHITE)).toBe("oklch(100% 0 0)");
  });
});

describe("HSL round trip", () => {
  it("converts red, white and black correctly", () => {
    expect(rgbToHsl(RED)).toMatchObject({ h: 0, s: 100, l: 50 });
    expect(rgbToHsl(WHITE)).toMatchObject({ s: 0, l: 100 });
    expect(rgbToHsl(BLACK)).toMatchObject({ s: 0, l: 0 });
  });

  it("survives a round trip for arbitrary colours", () => {
    for (const colour of [
      { r: 12, g: 200, b: 87, a: 1 },
      { r: 240, g: 12, b: 190, a: 1 },
      { r: 33, g: 44, b: 55, a: 1 },
    ]) {
      const back = hslToRgb(rgbToHsl(colour));
      expect(back.r).toBeCloseTo(colour.r, -0.5);
      expect(back.g).toBeCloseTo(colour.g, -0.5);
      expect(back.b).toBeCloseTo(colour.b, -0.5);
    }
  });
});

describe("sRGB transfer function", () => {
  it("maps the ends exactly", () => {
    expect(srgbToLinear(0)).toBe(0);
    expect(srgbToLinear(1)).toBeCloseTo(1, 6);
    expect(linearToSrgb(0)).toBe(0);
    expect(linearToSrgb(1)).toBeCloseTo(1, 6);
  });

  it("is its own inverse", () => {
    for (const value of [0.02, 0.2, 0.5, 0.9]) {
      expect(linearToSrgb(srgbToLinear(value))).toBeCloseTo(value, 6);
    }
  });
});

describe("OKLCH", () => {
  it("puts white and black at the ends of lightness with no chroma", () => {
    expect(rgbToOklch(WHITE).l).toBeCloseTo(1, 2);
    expect(rgbToOklch(WHITE).c).toBeCloseTo(0, 3);
    expect(rgbToOklch(BLACK).l).toBeCloseTo(0, 3);
  });

  it("gives red a hue near 29 degrees", () => {
    expect(rgbToOklch(RED).h).toBeCloseTo(29, 0);
  });

  it("survives a round trip within a rounding error", () => {
    for (const colour of [
      { r: 12, g: 200, b: 87, a: 1 },
      { r: 240, g: 12, b: 190, a: 1 },
      { r: 128, g: 128, b: 128, a: 1 },
    ]) {
      const back = oklchToRgb(rgbToOklch(colour));
      expect(Math.abs(back.r - colour.r)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.g - colour.g)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.b - colour.b)).toBeLessThanOrEqual(1);
    }
  });

  it("clamps colours that fall outside sRGB", () => {
    const wild = oklchToRgb({ l: 0.7, c: 0.4, h: 150, a: 1 });
    for (const channel of [wild.r, wild.g, wild.b]) {
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(255);
    }
  });

  it("keeps the hue when a colour will not fit in sRGB", () => {
    // A vivid green at this lightness is far outside sRGB.
    const wanted = { l: 0.7, c: 0.4, h: 150, a: 1 };
    expect(isInSrgbGamut(wanted)).toBe(false);

    const mapped = gamutMapOklch(wanted);
    expect(mapped.c).toBeLessThan(wanted.c);
    expect(mapped.h).toBe(wanted.h);
    expect(mapped.l).toBe(wanted.l);
    expect(isInSrgbGamut(mapped)).toBe(true);
  });

  it("leaves a colour that already fits completely alone", () => {
    const fits = { l: 0.5, c: 0.05, h: 200, a: 1 };
    expect(gamutMapOklch(fits)).toEqual(fits);
  });

  it("preserves hue far better than clamping the channels does", () => {
    const wanted = { l: 0.7, c: 0.4, h: 150, a: 1 };
    const clamped = rgbToOklch(oklchToRgb(wanted));
    const mapped = rgbToOklch(oklchToRgbInGamut(wanted));

    const drift = (h: number) => Math.abs((((h - 150) % 360) + 360) % 360);
    expect(drift(mapped.h)).toBeLessThan(drift(clamped.h));
    expect(drift(mapped.h)).toBeLessThan(2);
  });
});

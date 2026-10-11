import { describe, expect, it } from "vitest";

import {
  hslToRgb,
  NEUTRAL_RANGES,
  NEUTRAL_SHIFT,
  rangeWeight,
  rgbToHsl,
  shiftByRange,
} from "@/lib/image/editor/hue-ranges";

const RED: [number, number, number] = [1, 0, 0];
const BLUE: [number, number, number] = [0, 0, 1];
const GREY: [number, number, number] = [0.5, 0.5, 0.5];

describe("rgbToHsl and hslToRgb", () => {
  it("round-trip a colour", () => {
    const rgb: [number, number, number] = [0.2, 0.6, 0.4];
    hslToRgb(...rgbToHsl(...rgb)).forEach((value, i) =>
      expect(value).toBeCloseTo(rgb[i]),
    );
  });
});

describe("rangeWeight", () => {
  it("is fully on near the centre and fades to nothing", () => {
    expect(rangeWeight(0, 0)).toBe(1);
    expect(rangeWeight(0, 350)).toBe(1);
    expect(rangeWeight(0, 30)).toBeCloseTo(0.5);
    expect(rangeWeight(0, 60)).toBe(0);
    expect(rangeWeight(4, 240)).toBe(1);
  });
});

describe("shiftByRange", () => {
  it("does nothing with neutral shifts", () => {
    shiftByRange(RED, NEUTRAL_RANGES).forEach((value, i) =>
      expect(value).toBeCloseTo(RED[i]),
    );
  });

  it("only touches colours in the chosen range", () => {
    const shifts = {
      ...NEUTRAL_RANGES,
      reds: { ...NEUTRAL_SHIFT, saturation: -100 },
    };
    const [r, g, b] = shiftByRange(RED, shifts);
    expect(r).toBeCloseTo(g);
    expect(g).toBeCloseTo(b);
    shiftByRange(BLUE, shifts).forEach((value, i) =>
      expect(value).toBeCloseTo(BLUE[i]),
    );
  });

  it("rotates the hue of a range", () => {
    const shifts = { ...NEUTRAL_RANGES, reds: { ...NEUTRAL_SHIFT, hue: 120 } };
    const [r, g, b] = shiftByRange(RED, shifts);
    expect(g).toBeCloseTo(1);
    expect(r).toBeCloseTo(0);
    expect(b).toBeCloseTo(0);
  });

  it("lightens and darkens a range", () => {
    const lighter = shiftByRange(RED, {
      ...NEUTRAL_RANGES,
      reds: { ...NEUTRAL_SHIFT, lightness: 100 },
    });
    const darker = shiftByRange(RED, {
      ...NEUTRAL_RANGES,
      reds: { ...NEUTRAL_SHIFT, lightness: -100 },
    });
    lighter.forEach((value) => expect(value).toBeCloseTo(1));
    darker.forEach((value) => expect(value).toBeCloseTo(0));
  });

  it("leaves greys alone", () => {
    const shifts = {
      ...NEUTRAL_RANGES,
      reds: { hue: 90, saturation: 100, lightness: 50 },
    };
    expect(shiftByRange(GREY, shifts)).toEqual(GREY);
  });
});

import { describe, expect, it } from "vitest";

import { rgbToOklch } from "@/lib/colour/colour";
import {
  addStop,
  randomGradient,
  sampleGradient,
  toCssGradient,
  type GradientStop,
} from "@/lib/colour/gradient";

const BLUE = { r: 0, g: 0, b: 255, a: 1 };
const YELLOW = { r: 255, g: 255, b: 0, a: 1 };

const STOPS: GradientStop[] = [
  { colour: BLUE, position: 0 },
  { colour: YELLOW, position: 100 },
];

describe("toCssGradient", () => {
  it("writes each kind with OKLab interpolation", () => {
    expect(toCssGradient({ kind: "linear", angle: 90, stops: STOPS })).toBe(
      "linear-gradient(90deg in oklab, #0000ff 0%, #ffff00 100%)",
    );
    expect(toCssGradient({ kind: "radial", angle: 90, stops: STOPS })).toBe(
      "radial-gradient(circle in oklab, #0000ff 0%, #ffff00 100%)",
    );
    expect(toCssGradient({ kind: "conic", angle: 45, stops: STOPS })).toBe(
      "conic-gradient(from 45deg in oklab, #0000ff 0%, #ffff00 100%)",
    );
  });

  it("lists stops in order, wherever they sit in the array", () => {
    const css = toCssGradient({
      kind: "linear",
      angle: 0,
      stops: [...STOPS].reverse(),
    });
    expect(css.indexOf("#0000ff")).toBeLessThan(css.indexOf("#ffff00"));
  });
});

describe("sampleGradient", () => {
  it("returns the end colours at and beyond the ends", () => {
    expect(sampleGradient(STOPS, 0)).toEqual(BLUE);
    expect(sampleGradient(STOPS, -10)).toEqual(BLUE);
    expect(sampleGradient(STOPS, 100)).toEqual(YELLOW);
  });

  it("does not sink into grey halfway, as an sRGB blend would", () => {
    const middle = rgbToOklch(sampleGradient(STOPS, 50));
    const srgbMiddle = rgbToOklch({ r: 128, g: 128, b: 128, a: 1 });
    expect(middle.c).toBeGreaterThan(srgbMiddle.c + 0.02);
  });

  it("copes with two stops at the same position", () => {
    const hard = [
      ...STOPS,
      { colour: BLUE, position: 50 },
      { colour: YELLOW, position: 50 },
    ];
    expect(sampleGradient(hard, 50)).toBeDefined();
  });
});

describe("addStop", () => {
  it("fills the widest gap with the colour already there", () => {
    const before = [
      { colour: BLUE, position: 0 },
      { colour: BLUE, position: 20 },
      { colour: YELLOW, position: 100 },
    ];
    const after = addStop(before);
    expect(after).toHaveLength(4);
    expect(after[3]).toEqual({
      colour: sampleGradient(before, 60),
      position: 60,
    });
  });
});

describe("randomGradient", () => {
  it("keeps the kind and spreads its stops end to end", () => {
    const { kind, stops } = randomGradient("conic", () => 0.2);
    expect(kind).toBe("conic");
    expect(stops.map((stop) => stop.position)).toEqual([0, 100]);
  });

  it("uses three stops when the dice say so", () => {
    expect(randomGradient("linear", () => 0.7).stops).toHaveLength(3);
  });
});

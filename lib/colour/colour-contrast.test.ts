import { describe, expect, it } from "vitest";

import {
  bestTextOn,
  contrastRatio,
  flatten,
  gradeContrast,
  relativeLuminance,
} from "@/lib/colour/colour-contrast";

const WHITE = { r: 255, g: 255, b: 255, a: 1 };
const BLACK = { r: 0, g: 0, b: 0, a: 1 };
const MID_GREY = { r: 119, g: 119, b: 119, a: 1 };

describe("relativeLuminance", () => {
  it("anchors black at 0 and white at 1", () => {
    expect(relativeLuminance(BLACK)).toBeCloseTo(0, 6);
    expect(relativeLuminance(WHITE)).toBeCloseTo(1, 6);
  });

  it("weights green far above blue, as the eye does", () => {
    const green = relativeLuminance({ r: 0, g: 255, b: 0, a: 1 });
    const blue = relativeLuminance({ r: 0, g: 0, b: 255, a: 1 });
    expect(green).toBeCloseTo(0.7152, 4);
    expect(blue).toBeCloseTo(0.0722, 4);
  });
});

describe("contrastRatio", () => {
  it("gives 21 for black on white and 1 for a colour on itself", () => {
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21, 5);
    expect(contrastRatio(MID_GREY, MID_GREY)).toBeCloseTo(1, 6);
  });

  it("does not care which way round the pair is given", () => {
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(
      contrastRatio(WHITE, BLACK),
      6,
    );
  });
});

describe("flatten", () => {
  it("leaves an opaque colour alone", () => {
    expect(flatten(BLACK, WHITE)).toEqual(BLACK);
  });

  it("mixes a translucent colour onto its background first", () => {
    expect(flatten({ ...BLACK, a: 0.5 }, WHITE)).toEqual({
      r: 128,
      g: 128,
      b: 128,
      a: 1,
    });
  });
});

describe("gradeContrast", () => {
  it("passes everything for black on white", () => {
    const report = gradeContrast(BLACK, WHITE);
    expect(report.level).toBe("AAA");
    expect(report).toMatchObject({
      normalAa: true,
      normalAaa: true,
      largeAa: true,
      uiAa: true,
    });
  });

  it("fails everything for a colour on itself", () => {
    const report = gradeContrast(MID_GREY, MID_GREY);
    expect(report.level).toBe("Fail");
    expect(report.largeAa).toBe(false);
  });

  it("recognises the large-text-only band between 3 and 4.5", () => {
    // #949494 on white lands in that band.
    const report = gradeContrast({ r: 148, g: 148, b: 148, a: 1 }, WHITE);
    expect(report.ratio).toBeGreaterThan(3);
    expect(report.ratio).toBeLessThan(4.5);
    expect(report.level).toBe("AA Large");
    expect(report.normalAa).toBe(false);
    expect(report.uiAa).toBe(true);
  });

  it("judges a translucent foreground as it will actually look", () => {
    const solid = gradeContrast(BLACK, WHITE);
    const faded = gradeContrast({ ...BLACK, a: 0.2 }, WHITE);
    expect(faded.ratio).toBeLessThan(solid.ratio);
  });
});

describe("bestTextOn", () => {
  it("picks black on light and white on dark", () => {
    expect(bestTextOn(WHITE)).toEqual(BLACK);
    expect(bestTextOn(BLACK)).toEqual(WHITE);
    expect(bestTextOn({ r: 250, g: 204, b: 21, a: 1 })).toEqual(BLACK);
    expect(bestTextOn({ r: 30, g: 41, b: 59, a: 1 })).toEqual(WHITE);
  });
});

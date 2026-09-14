import { describe, expect, it } from "vitest";

import {
  DEFAULT_IMAGES_TO_PDF,
  fitOnPage,
  MAX_MARGIN,
  PAGE_SIZES,
  pageDimensions,
} from "@/lib/pdf/pdf-edit";

describe("fitOnPage", () => {
  it("scales a large image down to fit", () => {
    const box = fitOnPage(2000, 1000, 500, 500, 0);
    expect(box).toMatchObject({ width: 500, height: 250 });
  });

  it("centres what it draws", () => {
    const box = fitOnPage(2000, 1000, 500, 500, 0);
    expect(box.x).toBe(0);
    expect(box.y).toBe(125);
  });

  it("never enlarges past the page, whatever the shape", () => {
    for (const [w, h] of [
      [100, 4000],
      [4000, 100],
      [3000, 3000],
    ]) {
      const box = fitOnPage(w, h, 500, 700, 0);
      expect(box.width).toBeLessThanOrEqual(500.001);
      expect(box.height).toBeLessThanOrEqual(700.001);
    }
  });

  it("keeps the aspect ratio", () => {
    const box = fitOnPage(1600, 900, 500, 500, 0);
    expect(box.width / box.height).toBeCloseTo(1600 / 900, 5);
  });

  it("leaves the margin clear on every side", () => {
    const box = fitOnPage(1000, 1000, 500, 500, 50);
    expect(box.x).toBeGreaterThanOrEqual(50);
    expect(box.y).toBeGreaterThanOrEqual(50);
    expect(box.x + box.width).toBeLessThanOrEqual(450.001);
  });

  it("copes with a margin that would swallow the page", () => {
    const box = fitOnPage(1000, 1000, 100, 100, 500);
    expect(box.width).toBeGreaterThan(0);
    expect(Number.isFinite(box.x)).toBe(true);
  });
});

describe("pageDimensions", () => {
  it("wraps the image exactly when fitting to it", () => {
    expect(
      pageDimensions({ ...DEFAULT_IMAGES_TO_PDF, margin: 0 }, 800, 600),
    ).toEqual({ width: 800, height: 600 });
  });

  it("adds the margin on both sides when fitting", () => {
    expect(
      pageDimensions({ ...DEFAULT_IMAGES_TO_PDF, margin: 20 }, 800, 600),
    ).toEqual({ width: 840, height: 640 });
  });

  it("uses the standard size regardless of the image", () => {
    const a4 = pageDimensions(
      { ...DEFAULT_IMAGES_TO_PDF, pageSize: "a4" },
      4000,
      10,
    );
    expect(a4).toEqual({ width: PAGE_SIZES.a4.width, height: PAGE_SIZES.a4.height });
  });

  it("swaps the sides for landscape", () => {
    const landscape = pageDimensions(
      { ...DEFAULT_IMAGES_TO_PDF, pageSize: "a4", orientation: "landscape" },
      100,
      100,
    );
    expect(landscape.width).toBeGreaterThan(landscape.height);
    expect(landscape.width).toBeCloseTo(PAGE_SIZES.a4.height, 2);
  });

  it("ignores orientation when fitting to the image, which has its own", () => {
    const settings = {
      ...DEFAULT_IMAGES_TO_PDF,
      orientation: "landscape" as const,
    };
    expect(pageDimensions(settings, 800, 600)).toEqual({
      width: 800,
      height: 600,
    });
  });

  it("clamps an unreasonable margin", () => {
    const size = pageDimensions(
      { ...DEFAULT_IMAGES_TO_PDF, margin: 9999 },
      100,
      100,
    );
    expect(size.width).toBe(100 + MAX_MARGIN * 2);
  });
});

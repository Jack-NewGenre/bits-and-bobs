import { describe, expect, it } from "vitest";

import {
  clampDimension,
  fitWithin,
  MAX_DIMENSION,
  scaleToFit,
  unionBounds,
  intersectBounds,
} from "@/lib/image/editor/document";

describe("editor document", () => {
  it("clamps dimensions to whole pixels within range", () => {
    expect(clampDimension(0)).toBe(1);
    expect(clampDimension(12.6)).toBe(13);
    expect(clampDimension(99999)).toBe(MAX_DIMENSION);
    expect(clampDimension(Number.NaN)).toBe(1);
  });

  it("shrinks an oversized image on its long edge, keeping the ratio", () => {
    expect(fitWithin(8000, 4000, 4000)).toEqual({ width: 4000, height: 2000 });
    expect(fitWithin(300, 200, 4000)).toEqual({ width: 300, height: 200 });
  });

  it("scales a layer down to fit the document but never up", () => {
    expect(scaleToFit(2000, 1000, { width: 1000, height: 1000 })).toBe(0.5);
    expect(scaleToFit(100, 100, { width: 1000, height: 1000 })).toBe(1);
  });

  it("unions bounding boxes", () => {
    expect(
      unionBounds([
        { left: 10, top: 20, width: 10, height: 10 },
        { left: -5, top: 25, width: 10, height: 20 },
      ]),
    ).toEqual({ left: -5, top: 20, width: 25, height: 25 });
    expect(unionBounds([])).toBeNull();
  });
});

describe("intersectBounds", () => {
  it("returns the overlap", () => {
    expect(
      intersectBounds(
        { left: 0, top: 0, width: 10, height: 10 },
        { left: 5, top: -5, width: 10, height: 10 },
      ),
    ).toEqual({ left: 5, top: 0, width: 5, height: 5 });
  });

  it("returns null when the rectangles do not meet", () => {
    expect(
      intersectBounds(
        { left: 0, top: 0, width: 10, height: 10 },
        { left: 20, top: 0, width: 5, height: 5 },
      ),
    ).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import {
  loupeGrid,
  pixelAt,
  sampleAverage,
  type PixelSource,
} from "@/lib/image/pixel-sample";

/** A 3×3 image: black everywhere except a white centre. */
function makeSource(): PixelSource {
  const data = new Uint8ClampedArray(3 * 3 * 4);
  for (let index = 0; index < 9; index++) {
    const value = index === 4 ? 255 : 0;
    data.set([value, value, value, 255], index * 4);
  }
  return { data, width: 3, height: 3 };
}

const BLACK = { r: 0, g: 0, b: 0, a: 1 };
const WHITE = { r: 255, g: 255, b: 255, a: 1 };

describe("pixelAt", () => {
  it("reads the pixel under a point", () => {
    expect(pixelAt(makeSource(), 1.6, 1.2)).toEqual(WHITE);
    expect(pixelAt(makeSource(), 0, 0)).toEqual(BLACK);
  });

  it("clamps coordinates outside the image", () => {
    expect(pixelAt(makeSource(), -5, 10)).toEqual(BLACK);
  });

  it("turns alpha into 0–1", () => {
    const source = makeSource();
    source.data[3] = 128;
    expect(pixelAt(source, 0, 0).a).toBeCloseTo(0.502, 3);
  });
});

describe("sampleAverage", () => {
  it("returns the single pixel for a size of 1", () => {
    expect(sampleAverage(makeSource(), 1, 1, 1)).toEqual(WHITE);
  });

  it("averages a 3×3 square", () => {
    expect(sampleAverage(makeSource(), 1, 1, 3)).toEqual({
      r: 28,
      g: 28,
      b: 28,
      a: 1,
    });
  });

  it("skips pixels past the edge instead of repeating the border", () => {
    // Top-left corner: four real pixels, one of them white.
    expect(sampleAverage(makeSource(), 0, 0, 3)).toEqual({
      r: 64,
      g: 64,
      b: 64,
      a: 1,
    });
  });
});

describe("loupeGrid", () => {
  it("returns cells row by row, centred on the point", () => {
    const grid = loupeGrid(makeSource(), 1, 1, 3);
    expect(grid).toHaveLength(9);
    expect(grid[4]).toEqual(WHITE);
    expect(grid.filter((colour) => colour.r === 0)).toHaveLength(8);
  });

  it("repeats the border pixels past the edge", () => {
    const grid = loupeGrid(makeSource(), 0, 0, 3);
    expect(grid[0]).toEqual(BLACK);
    expect(grid[8]).toEqual(WHITE);
  });
});

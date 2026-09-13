import { describe, expect, it } from "vitest";

import { findContentBounds, padBounds } from "@/lib/trim";

/**
 * Build an RGBA buffer from a grid of alpha values, so each test reads as a
 * little picture of what it is trimming.
 */
function alphaGrid(rows: number[][]): {
  data: Uint8ClampedArray;
  width: number;
  height: number;
} {
  const height = rows.length;
  const width = rows[0].length;
  const data = new Uint8ClampedArray(width * height * 4);
  rows.flat().forEach((alpha, index) => {
    data[index * 4] = 255;
    data[index * 4 + 3] = alpha;
  });
  return { data, width, height };
}

describe("findContentBounds", () => {
  it("finds the box around a single opaque pixel", () => {
    const { data, width, height } = alphaGrid([
      [0, 0, 0],
      [0, 255, 0],
      [0, 0, 0],
    ]);

    expect(findContentBounds(data, width, height)).toEqual({
      left: 1,
      top: 1,
      right: 2,
      bottom: 2,
      width: 1,
      height: 1,
    });
  });

  it("spans every opaque pixel, not just the first", () => {
    const { data, width, height } = alphaGrid([
      [0, 255, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 255, 0],
    ]);

    expect(findContentBounds(data, width, height)).toMatchObject({
      left: 1,
      top: 0,
      width: 2,
      height: 3,
    });
  });

  it("returns undefined when nothing is opaque", () => {
    const { data, width, height } = alphaGrid([
      [0, 0],
      [0, 0],
    ]);
    expect(findContentBounds(data, width, height)).toBeUndefined();
  });

  it("covers the whole image when there is no margin", () => {
    const { data, width, height } = alphaGrid([
      [255, 255],
      [255, 255],
    ]);
    expect(findContentBounds(data, width, height)).toMatchObject({
      width: 2,
      height: 2,
    });
  });

  it("treats faint pixels at or below the threshold as empty", () => {
    const { data, width, height } = alphaGrid([
      [12, 12, 12],
      [12, 255, 12],
      [12, 12, 12],
    ]);

    // Without a threshold the faint fringe counts, so nothing is trimmed.
    expect(findContentBounds(data, width, height)).toMatchObject({
      width: 3,
      height: 3,
    });
    // With one, only the solid centre survives.
    expect(findContentBounds(data, width, height, 12)).toMatchObject({
      left: 1,
      top: 1,
      width: 1,
      height: 1,
    });
  });
});

describe("padBounds", () => {
  const bounds = {
    left: 4,
    top: 4,
    right: 6,
    bottom: 6,
    width: 2,
    height: 2,
  };

  it("grows the box evenly on every side", () => {
    expect(padBounds(bounds, 2, 20, 20)).toEqual({
      left: 2,
      top: 2,
      right: 8,
      bottom: 8,
      width: 6,
      height: 6,
    });
  });

  it("stops at the edges of the image", () => {
    expect(padBounds(bounds, 100, 10, 10)).toEqual({
      left: 0,
      top: 0,
      right: 10,
      bottom: 10,
      width: 10,
      height: 10,
    });
  });

  it("is a no-op for zero or negative padding", () => {
    expect(padBounds(bounds, 0, 20, 20)).toEqual(bounds);
    expect(padBounds(bounds, -5, 20, 20)).toEqual(bounds);
  });
});

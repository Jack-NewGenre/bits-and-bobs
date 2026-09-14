import { describe, expect, it } from "vitest";

import {
  applyPalette,
  collectPixels,
  nearestIn,
  quantise,
} from "@/lib/image/quantise";

/** Build an RGBA buffer from [r, g, b, a] tuples. */
function buffer(pixels: number[][]): Uint8ClampedArray {
  return new Uint8ClampedArray(pixels.flat());
}

const RED = [255, 0, 0];
const BLUE = [0, 0, 255];

describe("collectPixels", () => {
  it("returns one triple per visible pixel", () => {
    const data = buffer([
      [...RED, 255],
      [...BLUE, 255],
    ]);
    expect(collectPixels(data)).toEqual([RED, BLUE]);
  });

  it("skips pixels that are effectively invisible", () => {
    const data = buffer([
      [...RED, 255],
      [...BLUE, 0],
      [10, 10, 10, 4],
    ]);
    expect(collectPixels(data)).toEqual([RED]);
  });

  it("samples every nth pixel when asked", () => {
    const data = buffer([
      [1, 1, 1, 255],
      [2, 2, 2, 255],
      [3, 3, 3, 255],
      [4, 4, 4, 255],
    ]);
    expect(collectPixels(data, 2)).toEqual([
      [1, 1, 1],
      [3, 3, 3],
    ]);
  });
});

describe("quantise", () => {
  it("separates two obvious colours", () => {
    const pixels = [...Array(10).fill(RED), ...Array(10).fill(BLUE)];
    const palette = quantise(pixels, 2);

    expect(palette).toHaveLength(2);
    const hexes = palette.map((entry) => `${entry.colour.r},${entry.colour.b}`);
    expect(hexes).toContain("255,0");
    expect(hexes).toContain("0,255");
  });

  it("reports true dominance, not the size of the median-cut boxes", () => {
    const pixels = [...Array(3).fill(RED), ...Array(17).fill(BLUE)];
    const [first, second] = quantise(pixels, 2);

    // Median cut makes two boxes of ten; the real split is 17 to 3.
    expect(first.colour.b).toBe(255);
    expect(first.share).toBeCloseTo(0.85, 2);
    expect(second.share).toBeCloseTo(0.15, 2);
  });

  it("shares add up to the whole image", () => {
    const pixels = Array.from({ length: 40 }, (_, index) => [
      index * 6,
      255 - index * 6,
      120,
    ]);
    const total = quantise(pixels, 8).reduce(
      (sum, entry) => sum + entry.share,
      0,
    );
    expect(total).toBeCloseTo(1, 6);
  });

  it("never returns more boxes than there are distinct pixels", () => {
    expect(quantise([RED, BLUE], 16)).toHaveLength(2);
  });

  it("copes with an empty image", () => {
    expect(quantise([], 8)).toEqual([]);
  });

  it("splits along the channel that actually varies", () => {
    // Only red varies; green and blue are fixed.
    const pixels = Array.from({ length: 20 }, (_, index) => [
      index * 12,
      80,
      80,
    ]);
    const palette = quantise(pixels, 2);

    expect(palette[0].colour.g).toBe(80);
    expect(palette[0].colour.b).toBe(80);
    expect(palette[0].colour.r).not.toBe(palette[1].colour.r);
  });
});

describe("nearestIn", () => {
  it("finds the closest palette entry", () => {
    const palette = [
      { r: 255, g: 0, b: 0, a: 1 },
      { r: 0, g: 0, b: 255, a: 1 },
    ];
    expect(nearestIn(palette, 250, 10, 10)).toBe(palette[0]);
    expect(nearestIn(palette, 10, 10, 250)).toBe(palette[1]);
  });
});

describe("applyPalette", () => {
  const palette = [
    { r: 255, g: 0, b: 0, a: 1 },
    { r: 0, g: 0, b: 255, a: 1 },
  ];

  it("snaps every pixel onto the palette", () => {
    const data = buffer([
      [250, 5, 5, 255],
      [5, 5, 250, 255],
    ]);
    applyPalette(data, palette);

    expect(Array.from(data.slice(0, 3))).toEqual([255, 0, 0]);
    expect(Array.from(data.slice(4, 7))).toEqual([0, 0, 255]);
  });

  it("keeps alpha, so a cutout stays a cutout", () => {
    const data = buffer([[250, 5, 5, 128]]);
    applyPalette(data, palette);
    expect(data[3]).toBe(128);
  });

  it("leaves invisible pixels alone", () => {
    const data = buffer([[9, 9, 9, 0]]);
    applyPalette(data, palette);
    expect(Array.from(data)).toEqual([9, 9, 9, 0]);
  });

  it("is a no-op with an empty palette", () => {
    const data = buffer([[9, 9, 9, 255]]);
    expect(Array.from(applyPalette(data, []))).toEqual([9, 9, 9, 255]);
  });
});

import { describe, expect, it } from "vitest";

import {
  combineMasks,
  dilateMask,
  floodRegion,
  hexToRgba,
  invertMask,
  maskBounds,
  maskOutline,
  paintMask,
  rgbToHex,
  withOpacity,
  type PixelGrid,
} from "@/lib/image/editor/pixels";

/** A grid from rows of single-character colour codes. */
function grid(rows: string[], colours: Record<string, number[]>): PixelGrid {
  const height = rows.length;
  const width = rows[0].length;
  const data = new Uint8ClampedArray(width * height * 4);
  rows.forEach((row, y) =>
    [...row].forEach((code, x) => data.set(colours[code], (y * width + x) * 4)),
  );
  return { data, width, height };
}

const COLOURS = {
  w: [255, 255, 255, 255],
  b: [0, 0, 0, 255],
  g: [250, 250, 250, 255],
};

describe("floodRegion", () => {
  it("fills only the joined area of matching colour", () => {
    const image = grid(["wwbw", "wwbw", "bbbw"], COLOURS);
    const mask = floodRegion(image, 0, 0, 0);
    expect(Array.from(mask ?? [])).toEqual([
      255, 255, 0, 0, 255, 255, 0, 0, 0, 0, 0, 0,
    ]);
  });

  it("takes in similar colours within the tolerance", () => {
    const image = grid(["wg", "gw"], COLOURS);
    expect(Array.from(floodRegion(image, 0, 0, 0) ?? [])).toEqual([
      255, 0, 0, 0,
    ]);
    expect(Array.from(floodRegion(image, 0, 0, 10) ?? [])).toEqual([
      255, 255, 255, 255,
    ]);
  });

  it("treats every fully transparent pixel as the same colour", () => {
    const image = grid(["ab"], { a: [255, 0, 0, 0], b: [0, 0, 255, 0] });
    expect(Array.from(floodRegion(image, 0, 0, 0) ?? [])).toEqual([255, 255]);
  });

  it("returns null off the grid", () => {
    expect(floodRegion(grid(["w"], COLOURS), 4, 0, 0)).toBeNull();
  });
});

describe("masks", () => {
  const a = new Uint8Array([255, 255, 0, 0]);
  const b = new Uint8Array([0, 255, 255, 0]);

  it("adds, subtracts and replaces", () => {
    expect(Array.from(combineMasks(a, b, "add"))).toEqual([255, 255, 255, 0]);
    expect(Array.from(combineMasks(a, b, "subtract"))).toEqual([255, 0, 0, 0]);
    expect(combineMasks(a, b, "replace")).toBe(b);
    expect(combineMasks(null, b, "add")).toBe(b);
    expect(Array.from(combineMasks(null, b, "subtract"))).toEqual([0, 0, 0, 0]);
  });

  it("inverts", () => {
    expect(Array.from(invertMask(a))).toEqual([0, 0, 255, 255]);
  });

  it("finds the bounds of the selected pixels", () => {
    const mask = new Uint8Array([0, 0, 0, 0, 255, 255, 0, 255, 0]);
    expect(maskBounds(mask, 3, 3)).toEqual({
      left: 1,
      top: 1,
      width: 2,
      height: 2,
    });
    expect(maskBounds(new Uint8Array(4), 2, 2)).toBeNull();
  });

  it("outlines a selected square as four merged runs", () => {
    const mask = new Uint8Array([
      0, 0, 0, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 0, 0, 0,
    ]);
    const runs = maskOutline(mask, 4, 4);
    expect(runs).toEqual([1, 1, 3, 1, 1, 3, 3, 3, 1, 1, 1, 3, 3, 1, 3, 3]);
  });

  it("paints a colour through a mask", () => {
    const pixels = paintMask(new Uint8Array([255, 0, 128]), [10, 20, 30, 255]);
    expect(Array.from(pixels)).toEqual([
      10, 20, 30, 255, 0, 0, 0, 0, 10, 20, 30, 128,
    ]);
  });
});

describe("colours", () => {
  it("reads hex in long and short form", () => {
    expect(hexToRgba("#ff8000")).toEqual([255, 128, 0, 255]);
    expect(hexToRgba("#0f0", 10)).toEqual([0, 255, 0, 10]);
  });

  it("writes hex and translucent colours", () => {
    expect(rgbToHex(255, 8, 0)).toBe("#ff0800");
    expect(withOpacity("#000000", 50)).toBe("rgba(0, 0, 0, 0.5)");
  });
});

describe("dilateMask", () => {
  // A 5 × 5 mask with one selected pixel in the middle.
  const dot = Uint8Array.from({ length: 25 }, (_, index) =>
    index === 12 ? 255 : 0,
  );
  const rows = (mask: Uint8Array) =>
    Array.from({ length: 5 }, (_, y) =>
      [...mask.slice(y * 5, y * 5 + 5)]
        .map((value) => (value ? "#" : "."))
        .join(""),
    );

  it("spreads a pixel into a square of the given radius", () => {
    expect(rows(dilateMask(dot, 5, 5, 1))).toEqual([
      ".....",
      ".###.",
      ".###.",
      ".###.",
      ".....",
    ]);
  });

  it("stops at the edges of the grid", () => {
    expect(rows(dilateMask(dot, 5, 5, 3))).toEqual(Array(5).fill("#####"));
  });

  it("leaves the mask alone at radius 0", () => {
    expect(dilateMask(dot, 5, 5, 0)).toEqual(dot);
  });

  it("does not wrap round from one row to the next", () => {
    const edge = Uint8Array.from({ length: 25 }, (_, index) =>
      index === 4 ? 255 : 0,
    );
    expect(rows(dilateMask(edge, 5, 5, 1))).toEqual([
      "...##",
      "...##",
      ".....",
      ".....",
      ".....",
    ]);
  });
});

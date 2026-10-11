import { describe, expect, it } from "vitest";

import { detectPieces, readingOrder } from "@/lib/image/detect-pieces";
import { pixelGrid } from "@/test/pixel-grid";

const exact = { tolerance: 0, gap: 0 };

describe("detectPieces", () => {
  it("finds each separate piece on a white sheet, in reading order", () => {
    const sheet = pixelGrid([
      "..........",
      ".##....rr.",
      ".##....rr.",
      "..........",
      "...###....",
      "...###....",
      "..........",
    ]);
    expect(detectPieces(sheet, exact)).toEqual([
      { x: 1, y: 1, width: 2, height: 2 },
      { x: 7, y: 1, width: 2, height: 2 },
      { x: 3, y: 4, width: 3, height: 2 },
    ]);
  });

  it("finds pieces on a transparent sheet", () => {
    const sheet = pixelGrid([
      "       ",
      " ##  # ",
      " ##  # ",
      "     # ",
      "     # ",
      "       ",
    ]);
    expect(detectPieces(sheet, exact)).toEqual([
      { x: 1, y: 1, width: 2, height: 2 },
      { x: 5, y: 1, width: 1, height: 4 },
    ]);
  });

  it("joins islands closer than the gap, without padding the box", () => {
    const sheet = pixelGrid([
      ".........",
      ".##.##...",
      ".##.##...",
      ".........",
    ]);
    expect(detectPieces(sheet, exact)).toHaveLength(2);
    expect(detectPieces(sheet, { tolerance: 0, gap: 1 })).toEqual([
      { x: 1, y: 1, width: 5, height: 2 },
    ]);
  });

  it("treats near-backdrop speckle as backdrop within the tolerance", () => {
    const sheet = pixelGrid(["......", ".,,,,.", ".,,,,.", "......"]);
    expect(detectPieces(sheet, exact)).toEqual([
      { x: 1, y: 1, width: 4, height: 2 },
    ]);
    expect(detectPieces(sheet, { tolerance: 8, gap: 0 })).toEqual([]);
  });

  it("ignores a piece that is really the whole picture", () => {
    const white = { kind: "colour", r: 255, g: 255, b: 255 } as const;
    expect(detectPieces(pixelGrid(["###", "###"]), exact, white)).toEqual([]);
    expect(
      detectPieces(pixelGrid(["###", "###"]), exact, { kind: "transparent" }),
    ).toEqual([]);
  });
});

describe("readingOrder", () => {
  it("reads rows top to bottom and left to right within a row", () => {
    const box = (x: number, y: number, height = 10) => ({
      x,
      y,
      width: 10,
      height,
    });
    expect(
      readingOrder([box(50, 30), box(40, 2), box(0, 0, 20), box(0, 30)]),
    ).toEqual([box(0, 0, 20), box(40, 2), box(0, 30), box(50, 30)]);
  });
});

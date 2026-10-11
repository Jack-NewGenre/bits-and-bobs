import { describe, expect, it } from "vitest";

import {
  clearBackdrop,
  findBackdrop,
  matchesBackdrop,
} from "@/lib/image/backdrop";
import { alphaMap, pixelGrid } from "@/test/pixel-grid";

const WHITE = { kind: "colour", r: 255, g: 255, b: 255 } as const;

describe("findBackdrop", () => {
  it("reads a white sheet as white, ignoring a piece that touches the edge", () => {
    expect(findBackdrop(pixelGrid(["#....", ".....", "....."]))).toEqual(WHITE);
  });

  it("reads a mostly see-through border as transparent", () => {
    expect(findBackdrop(pixelGrid(["  #  ", " ### ", "     "]))).toEqual({
      kind: "transparent",
    });
  });

  it("copes with a single pixel", () => {
    expect(findBackdrop(pixelGrid(["r"]))).toEqual({
      kind: "colour",
      r: 220,
      g: 30,
      b: 30,
    });
  });
});

describe("matchesBackdrop", () => {
  const { data } = pixelGrid([".,# "]);

  it("allows near colours within the tolerance", () => {
    expect(matchesBackdrop(data, 0, WHITE, 0)).toBe(true);
    expect(matchesBackdrop(data, 4, WHITE, 0)).toBe(false);
    expect(matchesBackdrop(data, 4, WHITE, 8)).toBe(true);
    expect(matchesBackdrop(data, 8, WHITE, 128)).toBe(false);
  });

  it("treats a clear pixel as backdrop whatever the colour", () => {
    expect(matchesBackdrop(data, 12, WHITE, 0)).toBe(true);
    expect(matchesBackdrop(data, 12, { kind: "transparent" }, 0)).toBe(true);
    expect(matchesBackdrop(data, 8, { kind: "transparent" }, 128)).toBe(false);
  });
});

describe("clearBackdrop", () => {
  it("clears the backdrop around a piece but keeps the same colour enclosed by it", () => {
    const grid = pixelGrid([
      ".......",
      ".#####.",
      ".#...#.",
      ".#####.",
      ".......",
    ]);
    clearBackdrop(grid, WHITE, 0);
    expect(alphaMap(grid)).toEqual([
      "       ",
      " ooooo ",
      " ooooo ",
      " ooooo ",
      "       ",
    ]);
  });

  it("follows a gap into the piece", () => {
    const grid = pixelGrid(["#.#", "#.#", "###"]);
    clearBackdrop(grid, WHITE, 0);
    expect(alphaMap(grid)).toEqual(["o o", "o o", "ooo"]);
  });
});

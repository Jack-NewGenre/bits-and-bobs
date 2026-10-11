import { describe, expect, it } from "vitest";

import {
  isUsableRect,
  moveRect,
  rectFromPoints,
  resizeRect,
  scaleRect,
} from "@/lib/image/cut-rect";

const bounds = { width: 400, height: 200 };
const rect = { x: 100, y: 50, width: 80, height: 40 };

describe("rectFromPoints", () => {
  it("normalises a drag in any direction", () => {
    expect(
      rectFromPoints({ x: 120.4, y: 90 }, { x: 20, y: 10.6 }, bounds),
    ).toEqual({
      x: 20,
      y: 11,
      width: 100,
      height: 79,
    });
  });

  it("stops at the image's edges", () => {
    expect(
      rectFromPoints({ x: -30, y: 150 }, { x: 50, y: 900 }, bounds),
    ).toEqual({
      x: 0,
      y: 150,
      width: 50,
      height: 50,
    });
  });
});

describe("isUsableRect", () => {
  it("rejects a box too thin to be a cut", () => {
    expect(isUsableRect(rect)).toBe(true);
    expect(isUsableRect({ ...rect, width: 3 })).toBe(false);
  });
});

describe("moveRect", () => {
  it("moves by the delta, keeping the size", () => {
    expect(moveRect(rect, 10, -20, bounds)).toEqual({ ...rect, x: 110, y: 30 });
  });

  it("stops at the edges", () => {
    expect(moveRect(rect, 1000, -1000, bounds)).toEqual({
      ...rect,
      x: 320,
      y: 0,
    });
  });
});

describe("resizeRect", () => {
  it("drags the south-east corner freely", () => {
    expect(resizeRect(rect, "se", 20, 5, bounds)).toEqual({
      ...rect,
      width: 100,
      height: 45,
    });
  });

  it("drags the north-west corner while the opposite one stays", () => {
    expect(resizeRect(rect, "nw", -10, 10, bounds)).toEqual({
      x: 90,
      y: 60,
      width: 90,
      height: 30,
    });
  });

  it("never flips past the opposite corner", () => {
    expect(resizeRect(rect, "ne", -500, 500, bounds)).toEqual({
      x: 100,
      y: 86,
      width: 4,
      height: 4,
    });
  });

  it("stops at the edges", () => {
    expect(resizeRect(rect, "sw", -500, 500, bounds)).toEqual({
      x: 0,
      y: 50,
      width: 180,
      height: 150,
    });
  });
});

describe("scaleRect", () => {
  it("maps a shrunken box back up with a margin, inside the image", () => {
    expect(
      scaleRect({ x: 10, y: 0, width: 5, height: 5 }, 4, 2, bounds),
    ).toEqual({
      x: 38,
      y: 0,
      width: 24,
      height: 22,
    });
  });
});

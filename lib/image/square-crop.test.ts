import { describe, expect, it } from "vitest";

import { centreSquare, moveCrop, resizeCrop } from "@/lib/image/square-crop";

const bounds = { width: 400, height: 200 };

describe("centreSquare", () => {
  it("crops a landscape image from the middle", () => {
    expect(centreSquare({ width: 300, height: 100 })).toEqual({
      x: 100,
      y: 0,
      side: 100,
    });
  });

  it("crops a portrait image from the middle", () => {
    expect(centreSquare({ width: 80, height: 200 })).toEqual({
      x: 0,
      y: 60,
      side: 80,
    });
  });

  it("leaves a square alone", () => {
    expect(centreSquare({ width: 64, height: 64 })).toEqual({
      x: 0,
      y: 0,
      side: 64,
    });
  });
});

describe("moveCrop", () => {
  const crop = { x: 100, y: 50, side: 100 };

  it("moves by the delta", () => {
    expect(moveCrop(crop, 20, -10, bounds)).toEqual({
      x: 120,
      y: 40,
      side: 100,
    });
  });

  it("stops at every edge", () => {
    expect(moveCrop(crop, -500, -500, bounds)).toEqual({
      x: 0,
      y: 0,
      side: 100,
    });
    expect(moveCrop(crop, 500, 500, bounds)).toEqual({
      x: 300,
      y: 100,
      side: 100,
    });
  });
});

describe("resizeCrop", () => {
  const crop = { x: 100, y: 50, side: 100 };

  it("grows from the bottom-right, keeping the top-left fixed", () => {
    expect(resizeCrop(crop, "se", 20, 20, bounds)).toEqual({
      x: 100,
      y: 50,
      side: 120,
    });
  });

  it("grows from the top-left, keeping the bottom-right fixed", () => {
    expect(resizeCrop(crop, "nw", -20, -20, bounds)).toEqual({
      x: 80,
      y: 30,
      side: 120,
    });
  });

  it("averages an off-diagonal drag so the box stays square", () => {
    expect(resizeCrop(crop, "ne", 30, -10, bounds)).toEqual({
      x: 100,
      y: 30,
      side: 120,
    });
  });

  it("stops growing at the nearest edge", () => {
    expect(resizeCrop(crop, "se", 500, 500, bounds)).toEqual({
      x: 100,
      y: 50,
      side: 150,
    });
    expect(resizeCrop(crop, "sw", -500, 500, bounds)).toEqual({
      x: 50,
      y: 50,
      side: 150,
    });
  });

  it("never shrinks below the minimum", () => {
    expect(resizeCrop(crop, "se", -500, -500, bounds).side).toBe(16);
  });

  it("allows less than the minimum when the image is smaller", () => {
    const tiny = { width: 10, height: 10 };
    expect(resizeCrop({ x: 0, y: 0, side: 10 }, "se", -5, -5, tiny).side).toBe(
      10,
    );
  });
});

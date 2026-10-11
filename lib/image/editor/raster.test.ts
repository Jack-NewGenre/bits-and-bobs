import { describe, expect, it } from "vitest";
import { util, type TMat2D } from "fabric";

import { MAX_DIMENSION } from "@/lib/image/editor/document";
import {
  centreAfterGrowth,
  paintArea,
  sceneToPixels,
} from "@/lib/image/editor/raster";

// A 100 × 50 layer centred at (200, 100), at its natural size.
const PLAIN: TMat2D = [1, 0, 0, 1, 200, 100];
// The same layer shown at half size.
const HALF: TMat2D = [0.5, 0, 0, 0.5, 200, 100];

describe("paintArea", () => {
  it("keeps the layer's own grid for a stroke inside it", () => {
    expect(
      paintArea(PLAIN, 100, 50, { left: 160, top: 80, width: 20, height: 10 }),
    ).toEqual({
      left: 0,
      top: 0,
      width: 100,
      height: 50,
    });
  });

  it("grows the grid to take in a stroke past the top left", () => {
    expect(
      paintArea(PLAIN, 100, 50, { left: 130, top: 60, width: 30, height: 20 }),
    ).toEqual({
      left: -20,
      top: -15,
      width: 120,
      height: 65,
    });
  });

  it("measures in the layer's own pixels when it is scaled", () => {
    const area = paintArea(HALF, 100, 50, {
      left: 240,
      top: 100,
      width: 20,
      height: 10,
    });
    expect(area).toEqual({ left: 0, top: 0, width: 170, height: 50 });
  });

  it("refuses to grow past the largest layer size", () => {
    const reach = { left: 0, top: 0, width: MAX_DIMENSION * 2, height: 10 };
    expect(paintArea(PLAIN, 100, 50, reach)).toEqual({
      left: 0,
      top: 0,
      width: 100,
      height: 50,
    });
  });
});

describe("sceneToPixels", () => {
  it("maps the layer's top left corner to pixel (0, 0)", () => {
    const area = { left: 0, top: 0, width: 100, height: 50 };
    const point = util.transformPoint(
      { x: 150, y: 75 },
      sceneToPixels(PLAIN, 100, 50, area),
    );
    expect(point.x).toBeCloseTo(0);
    expect(point.y).toBeCloseTo(0);
  });

  it("allows for a grid that grew to the left", () => {
    const area = { left: -20, top: 0, width: 120, height: 50 };
    const point = util.transformPoint(
      { x: 150, y: 75 },
      sceneToPixels(PLAIN, 100, 50, area),
    );
    expect(point.x).toBeCloseTo(20);
  });

  it("undoes the layer's scale", () => {
    const area = { left: 0, top: 0, width: 100, height: 50 };
    const point = util.transformPoint(
      { x: 200, y: 100 },
      sceneToPixels(HALF, 100, 50, area),
    );
    expect(point.x).toBeCloseTo(50);
    expect(point.y).toBeCloseTo(25);
  });
});

describe("centreAfterGrowth", () => {
  it("stays put when the grid does not grow", () => {
    const centre = centreAfterGrowth(PLAIN, 100, 50, {
      left: 0,
      top: 0,
      width: 100,
      height: 50,
    });
    expect(centre).toMatchObject({ x: 200, y: 100 });
  });

  it("moves by half the growth, scaled into the scene", () => {
    const centre = centreAfterGrowth(HALF, 100, 50, {
      left: -20,
      top: 0,
      width: 120,
      height: 50,
    });
    expect(centre.x).toBeCloseTo(195);
    expect(centre.y).toBeCloseTo(100);
  });
});

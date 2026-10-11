import { describe, expect, it } from "vitest";
import { Polygon, Rect } from "fabric";

import {
  createShape,
  dragBounds,
  resizeShape,
  shapeLayerKind,
  shapePoints,
} from "@/lib/image/editor/shapes";
import { fontLabel } from "@/lib/image/editor/text";

const BOX = { left: 0, top: 0, width: 100, height: 100 };
const STYLE = {
  fill: "#f00",
  stroke: "#000",
  strokeWidth: 0,
  cornerRadius: 12,
  sides: 5,
};

describe("dragBounds", () => {
  it("normalises a drag in any direction", () => {
    expect(dragBounds({ x: 50, y: 50 }, { x: 10, y: 20 })).toEqual({
      left: 10,
      top: 20,
      width: 40,
      height: 30,
    });
  });

  it("squares the box on its longer side, keeping the drag direction", () => {
    expect(dragBounds({ x: 50, y: 50 }, { x: 10, y: 40 }, true)).toEqual({
      left: 10,
      top: 10,
      width: 40,
      height: 40,
    });
  });
});

describe("shapePoints", () => {
  it("points a triangle up from the bottom corners", () => {
    expect(shapePoints("triangle", BOX, 3)).toEqual([
      { x: 50, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ]);
  });

  it("gives a polygon its sides and a star twice as many corners", () => {
    expect(shapePoints("polygon", BOX, 6)).toHaveLength(6);
    expect(shapePoints("star", BOX, 5)).toHaveLength(10);
    const [top] = shapePoints("polygon", BOX, 6);
    expect(top.x).toBeCloseTo(50);
    expect(top.y).toBeCloseTo(0);
  });

  it("keeps the side count in range", () => {
    expect(shapePoints("polygon", BOX, 1)).toHaveLength(3);
    expect(shapePoints("polygon", BOX, 99)).toHaveLength(12);
  });

  it("draws an arrow pointing right inside the box", () => {
    const points = shapePoints("arrow", BOX, 3);
    expect(Math.max(...points.map((p) => p.x))).toBe(100);
    expect(points.find((p) => p.x === 100)?.y).toBe(50);
  });
});

describe("createShape", () => {
  it("rounds rectangle corners", () => {
    const rect = createShape("rect", BOX, STYLE);
    expect(rect).toBeInstanceOf(Rect);
    expect((rect as Rect).rx).toBe(12);
  });

  it("builds outline shapes as polygons that follow a drag", () => {
    const star = createShape("star", { ...BOX, width: 0, height: 0 }, STYLE);
    expect(star).toBeInstanceOf(Polygon);
    resizeShape(star, "star", { x: 0, y: 0 }, BOX, { x: 100, y: 100 }, 5);
    const bounds = star.getBoundingRect();
    expect(bounds.width).toBeGreaterThan(80);
    expect(shapeLayerKind("star")).toBe("polygon");
    expect(shapeLayerKind("rect")).toBe("rect");
  });
});

describe("fontLabel", () => {
  it("names known stacks and falls back to the first family", () => {
    expect(fontLabel("Georgia, 'Times New Roman', serif")).toBe("Serif");
    expect(fontLabel("'Fira Code', monospace")).toBe("Fira Code");
  });
});

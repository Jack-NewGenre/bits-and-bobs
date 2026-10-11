import { describe, expect, it } from "vitest";

import {
  anchorIndex,
  edgeCost,
  liveWire,
  snapToEdge,
} from "@/lib/image/editor/magnetic";
import type { PixelGrid } from "@/lib/image/editor/pixels";
import type { Point2D } from "@/lib/image/editor/shapes";

const SIZE = 40;

/** A grid painted by `paint`, which returns [grey, alpha] for each pixel. */
function makeGrid(
  width: number,
  height: number,
  paint: (x: number, y: number) => readonly [number, number],
): PixelGrid {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [grey, alpha] = paint(x, y);
      data.set([grey, grey, grey, alpha], (y * width + x) * 4);
    }
  }
  return { data, width, height };
}

const verticalEdge = makeGrid(SIZE, SIZE, (x) =>
  x < 20 ? [20, 255] : [230, 255],
);
/** A dark square in the top-left corner, so its boundary is an L. */
const cornerSquare = makeGrid(SIZE, SIZE, (x, y) =>
  x < 20 && y < 20 ? [20, 255] : [230, 255],
);

function at(cost: Float32Array, x: number, y: number): number {
  return cost[y * SIZE + x];
}

function expectConnected(path: readonly Point2D[]): void {
  for (let i = 1; i < path.length; i++) {
    expect(Math.abs(path[i].x - path[i - 1].x)).toBeLessThanOrEqual(1);
    expect(Math.abs(path[i].y - path[i - 1].y)).toBeLessThanOrEqual(1);
    expect(path[i]).not.toEqual(path[i - 1]);
  }
}

describe("edgeCost", () => {
  it("is low along a sharp edge and high on flat colour", () => {
    const cost = edgeCost(verticalEdge);
    expect(cost).toHaveLength(SIZE * SIZE);
    for (const y of [0, 10, 39]) {
      expect(at(cost, 19, y)).toBeLessThan(0.1);
      expect(at(cost, 20, y)).toBeLessThan(0.1);
      expect(at(cost, 5, y)).toBeCloseTo(1);
      expect(at(cost, 34, y)).toBeCloseTo(1);
    }
  });

  it("treats the edge of a cut-out as magnetic even when the colour is the same", () => {
    const cost = edgeCost(makeGrid(SIZE, SIZE, (x) => [128, x < 20 ? 255 : 0]));
    expect(at(cost, 19, 10)).toBeLessThan(0.1);
    expect(at(cost, 5, 10)).toBeCloseTo(1);
  });

  it("is uniformly high on a flat image", () => {
    const cost = edgeCost(makeGrid(8, 8, () => [90, 255]));
    expect(Array.from(cost).every((value) => value === 1)).toBe(true);
  });
});

describe("liveWire", () => {
  it("follows the edge, endpoints included", () => {
    const cost = edgeCost(verticalEdge);
    const path = liveWire(cost, SIZE, SIZE, { x: 19, y: 5 }, { x: 20, y: 30 });
    expect(path[0]).toEqual({ x: 19, y: 5 });
    expect(path.at(-1)).toEqual({ x: 20, y: 30 });
    expectConnected(path);
    expect(path.every(({ x }) => x === 19 || x === 20)).toBe(true);
  });

  it("goes round a corner rather than cutting across flat colour", () => {
    const cost = edgeCost(cornerSquare);
    const path = liveWire(cost, SIZE, SIZE, { x: 19, y: 3 }, { x: 3, y: 19 });
    expect(path[0]).toEqual({ x: 19, y: 3 });
    expect(path.at(-1)).toEqual({ x: 3, y: 19 });
    expectConnected(path);
    expect(path.every(({ x, y }) => at(cost, x, y) < 0.5)).toBe(true);
    expect(Math.max(...path.map(({ x, y }) => x + y))).toBeGreaterThanOrEqual(
      37,
    );
  });

  it("rounds and clamps endpoints to the grid", () => {
    const cost = edgeCost(verticalEdge);
    const path = liveWire(
      cost,
      SIZE,
      SIZE,
      { x: 19.4, y: -12 },
      { x: 19.2, y: 99 },
    );
    expect(path[0]).toEqual({ x: 19, y: 0 });
    expect(path.at(-1)).toEqual({ x: 19, y: SIZE - 1 });
  });

  it("returns the single point when from equals to", () => {
    const cost = edgeCost(verticalEdge);
    expect(liveWire(cost, SIZE, SIZE, { x: 7, y: 7 }, { x: 7, y: 7 })).toEqual([
      { x: 7, y: 7 },
    ]);
  });

  it("is quick enough to run on every mouse move", () => {
    const width = 1600;
    let seed = 7;
    const noisy = makeGrid(width, width, () => {
      seed = (seed * 1103515245 + 12345) >>> 0;
      return [seed >>> 24, 255];
    });
    const cost = edgeCost(noisy);
    const started = performance.now();
    const path = liveWire(
      cost,
      width,
      width,
      { x: 700, y: 700 },
      { x: 900, y: 900 },
    );
    const elapsed = performance.now() - started;
    expect(path.at(-1)).toEqual({ x: 900, y: 900 });
    expect(elapsed).toBeLessThan(100);
  });
});

describe("snapToEdge", () => {
  const cost = edgeCost(verticalEdge);

  it("moves a nearby point onto the edge", () => {
    const snapped = snapToEdge(cost, SIZE, SIZE, { x: 14.3, y: 10.2 }, 8);
    expect([19, 20]).toContain(snapped.x);
    expect(snapped.y).toBe(10);
  });

  it("keeps the rounded point when nothing within reach is better", () => {
    expect(snapToEdge(cost, SIZE, SIZE, { x: 4.6, y: 10.4 }, 5)).toEqual({
      x: 5,
      y: 10,
    });
  });
});

describe("anchorIndex", () => {
  const line = Array.from({ length: 11 }, (_, x) => ({ x, y: 0 }));

  it("finds the furthest point within the spacing", () => {
    expect(anchorIndex(line, 4)).toBe(4);
    expect(anchorIndex(line, 4.5)).toBe(4);
  });

  it("counts diagonal steps by their true length", () => {
    const diagonal = Array.from({ length: 6 }, (_, i) => ({ x: i, y: i }));
    expect(anchorIndex(diagonal, 3)).toBe(2);
  });

  it("returns -1 when the wire is shorter than the spacing", () => {
    expect(anchorIndex(line, 12)).toBe(-1);
    expect(anchorIndex([{ x: 0, y: 0 }], 5)).toBe(-1);
  });

  it("anchors at the end when the wire is exactly the spacing", () => {
    expect(anchorIndex(line, 10)).toBe(10);
  });
});

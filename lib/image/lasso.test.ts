import { describe, expect, it } from "vitest";

import { addLassoPoint, cutFromLasso, svgPoints } from "@/lib/image/lasso";

const bounds = { width: 100, height: 50 };

describe("addLassoPoint", () => {
  it("adds a point that has moved far enough", () => {
    expect(addLassoPoint([{ x: 10, y: 10 }], { x: 15, y: 10 }, bounds)).toEqual(
      [
        { x: 10, y: 10 },
        { x: 15, y: 10 },
      ],
    );
  });

  it("skips a point that barely moved, keeping the same trail", () => {
    const trail = [{ x: 10, y: 10 }];
    expect(addLassoPoint(trail, { x: 11, y: 10.5 }, bounds)).toBe(trail);
  });

  it("keeps points inside the image", () => {
    expect(addLassoPoint([], { x: -20, y: 80 }, bounds)).toEqual([
      { x: 0, y: 50 },
    ]);
  });
});

describe("cutFromLasso", () => {
  it("boxes the outline and keeps it relative to the box", () => {
    const trail = [
      { x: 10.5, y: 20 },
      { x: 30, y: 20.25 },
      { x: 20, y: 40.75 },
    ];
    expect(cutFromLasso(trail)).toEqual({
      x: 10,
      y: 20,
      width: 20,
      height: 21,
      path: [
        { x: 0.5, y: 0 },
        { x: 20, y: 0.25 },
        { x: 10, y: 20.75 },
      ],
    });
  });

  it("rejects fewer than three points", () => {
    expect(
      cutFromLasso([
        { x: 0, y: 0 },
        { x: 40, y: 40 },
      ]),
    ).toBeNull();
  });

  it("rejects an outline too small to be a real cut", () => {
    expect(
      cutFromLasso([
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 1, y: 2 },
      ]),
    ).toBeNull();
  });
});

describe("svgPoints", () => {
  it("joins points into an SVG points list", () => {
    expect(
      svgPoints([
        { x: 1, y: 2 },
        { x: 3.5, y: 4 },
      ]),
    ).toBe("1,2 3.5,4");
  });
});

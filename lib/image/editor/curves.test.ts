import { describe, expect, it } from "vitest";

import {
  curveTable,
  evaluateSpline,
  curveSpline,
  isIdentityCurve,
} from "@/lib/image/editor/curves";

describe("curveTable", () => {
  it("leaves every value alone on the identity curve", () => {
    const table = curveTable([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]);
    expect(Array.from(table)).toEqual(Array.from({ length: 256 }, (_, i) => i));
  });

  it("passes through every point it is given", () => {
    const spline = curveSpline([
      { x: 0, y: 0 },
      { x: 0.25, y: 0.4 },
      { x: 0.75, y: 0.6 },
      { x: 1, y: 1 },
    ]);
    expect(evaluateSpline(spline, 0.25)).toBeCloseTo(0.4);
    expect(evaluateSpline(spline, 0.75)).toBeCloseTo(0.6);
  });

  it("lifts the midtones when the middle point is raised", () => {
    const table = curveTable([
      { x: 0, y: 0 },
      { x: 0.5, y: 0.7 },
      { x: 1, y: 1 },
    ]);
    expect(table[128]).toBeGreaterThan(170);
    expect(table[0]).toBe(0);
    expect(table[255]).toBe(255);
  });

  it("stays flat outside the end points and clamps", () => {
    const table = curveTable([
      { x: 0.2, y: 0.1 },
      { x: 0.8, y: 1.2 },
    ]);
    expect(table[0]).toBe(Math.round(0.1 * 255));
    expect(table[255]).toBe(255);
  });

  it("sorts points given out of order", () => {
    const sorted = curveTable([
      { x: 0, y: 0 },
      { x: 0.5, y: 0.3 },
      { x: 1, y: 1 },
    ]);
    const shuffled = curveTable([
      { x: 1, y: 1 },
      { x: 0, y: 0 },
      { x: 0.5, y: 0.3 },
    ]);
    expect(Array.from(shuffled)).toEqual(Array.from(sorted));
  });
});

describe("isIdentityCurve", () => {
  it("spots a straight diagonal", () => {
    expect(
      isIdentityCurve([
        { x: 0, y: 0 },
        { x: 0.5, y: 0.5 },
        { x: 1, y: 1 },
      ]),
    ).toBe(true);
    expect(
      isIdentityCurve([
        { x: 0, y: 0 },
        { x: 0.5, y: 0.6 },
        { x: 1, y: 1 },
      ]),
    ).toBe(false);
  });
});

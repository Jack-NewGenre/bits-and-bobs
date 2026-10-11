import { describe, expect, it } from "vitest";

import { gazeOnSphere, gazeShift, gazeToward } from "@/lib/gaze";

describe("gazeShift", () => {
  it("scales the gaze into a pixel translate", () => {
    expect(gazeShift(5, 3)).toBe("translate(calc(var(--gaze-x) * 5px), calc(var(--gaze-y) * 3px))");
  });
});

describe("gazeOnSphere", () => {
  it("turns with the head by default", () => {
    const transform = gazeOnSphere(-18, 10, 54);
    expect(transform).toContain("calc(-18deg + var(--gaze-x) * 38deg)");
    expect(transform).toContain("calc(10deg + var(--gaze-y) * 16deg)");
    expect(transform).toContain("* 54px");
    expect(transform).toMatch(/^translate\(.*\) scale\(cos\(.*\), cos\(.*\)\)$/);
  });

  it("can hold a feature level while it still turns sideways", () => {
    const transform = gazeOnSphere(0, 0, 46, { yaw: 38, pitch: 0 });
    expect(transform).toContain("var(--gaze-x) * 38deg");
    expect(transform).toContain("var(--gaze-y) * 0deg");
  });
});

describe("gazeToward", () => {
  it("looks straight ahead when the pointer is dead centre", () => {
    expect(gazeToward(0, 0, 100)).toEqual({ x: 0, y: 0 });
  });

  it("points at the pointer, scaled by distance over reach", () => {
    expect(gazeToward(50, 0, 100)).toEqual({ x: 0.5, y: 0 });
    expect(gazeToward(0, -25, 100)).toEqual({ x: 0, y: -0.25 });
  });

  it("never grows beyond full strength", () => {
    const { x, y } = gazeToward(300, 400, 100);
    expect(x).toBeCloseTo(0.6);
    expect(y).toBeCloseTo(0.8);
    expect(Math.hypot(x, y)).toBeCloseTo(1);
  });

  it("stays still when reach is not positive", () => {
    expect(gazeToward(10, 10, 0)).toEqual({ x: 0, y: 0 });
  });
});

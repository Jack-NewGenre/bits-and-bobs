import { describe, expect, it } from "vitest";

import {
  boxBlur,
  distanceInside,
  distanceOutside,
  distanceTransform,
} from "@/lib/image/editor/distance";

describe("distance fields", () => {
  it("measures exact Euclidean distance to the nearest seed", () => {
    const seeds = new Uint8Array(25);
    seeds[12] = 1;
    const { distance, nearest } = distanceTransform(seeds, 5, 5);
    expect(distance[12]).toBe(0);
    expect(distance[0]).toBeCloseTo(Math.SQRT2 * 2);
    expect(distance[14]).toBeCloseTo(2);
    expect(nearest[0]).toBe(12);
  });

  it("finds the nearer of two seeds", () => {
    const seeds = new Uint8Array(10);
    seeds[1] = 1;
    seeds[8] = 1;
    const { distance, nearest } = distanceTransform(seeds, 10, 1);
    expect(Array.from(distance)).toEqual([1, 0, 1, 2, 3, 3, 2, 1, 0, 1]);
    expect(nearest[3]).toBe(1);
    expect(nearest[6]).toBe(8);
  });

  it("places the edge by coverage outside and is negative inside", () => {
    const alpha = new Float32Array([0, 0, 0.5, 1, 1]);
    const outside = distanceOutside(alpha, 5, 1);
    expect(outside[3]).toBe(-0.5);
    expect(outside[1]).toBeCloseTo(1);
    expect(outside[0]).toBeCloseTo(2);
    const inside = distanceInside(alpha, 5, 1);
    expect(inside[0]).toBe(-0.5);
    expect(inside[2]).toBeCloseTo(0.5);
    expect(inside[4]).toBeCloseTo(2.5);
  });
});

describe("box blur", () => {
  it("keeps the total, spreads no further than its reach and stays symmetric", () => {
    const map = new Float32Array(21 * 21);
    map[10 * 21 + 10] = 1;
    boxBlur(map, 21, 21, 6);
    const total = map.reduce((sum, v) => sum + v, 0);
    expect(total).toBeCloseTo(1, 5);
    expect(map[10 * 21 + 16]).toBeGreaterThan(0);
    expect(map[10 * 21 + 17]).toBe(0);
    expect(map[10 * 21 + 13]).toBeCloseTo(map[10 * 21 + 7]);
    expect(map[13 * 21 + 10]).toBeCloseTo(map[10 * 21 + 13]);
  });

  it("does nothing with no reach", () => {
    const map = new Float32Array([0, 1, 0]);
    boxBlur(map, 3, 1, 0);
    expect(Array.from(map)).toEqual([0, 1, 0]);
  });
});

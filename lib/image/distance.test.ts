import { describe, expect, it } from "vitest";

import { squaredDistances } from "@/lib/image/distance";

describe("squaredDistances", () => {
  it("measures the exact squared distance to the nearest seed", () => {
    const distances = squaredDistances((i) => i === 0, 4, 3);

    expect([...distances]).toEqual([0, 1, 4, 9, 1, 2, 5, 10, 4, 5, 8, 13]);
  });

  it("takes the nearer of two seeds", () => {
    const distances = squaredDistances((i) => i === 0 || i === 4, 5, 1);

    expect([...distances]).toEqual([0, 1, 4, 1, 0]);
  });

  it("treats every pixel as far away when there are no seeds", () => {
    const distances = squaredDistances(() => false, 2, 2);

    expect(Math.min(...distances)).toBeGreaterThan(1e10);
  });
});

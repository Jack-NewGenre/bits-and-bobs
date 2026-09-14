import { describe, expect, it } from "vitest";

import { computeSampleSize, SAMPLE_DIM } from "@/lib/colour/palette";

describe("computeSampleSize", () => {
  it("leaves a small image alone rather than enlarging it", () => {
    expect(computeSampleSize(120, 80)).toEqual({ width: 120, height: 80 });
  });

  it("shrinks a large image to the sample size", () => {
    const size = computeSampleSize(4000, 2000);
    expect(Math.max(size.width, size.height)).toBe(SAMPLE_DIM);
    expect(size).toEqual({ width: 200, height: 100 });
  });

  it("keeps the aspect ratio for a tall image", () => {
    const size = computeSampleSize(1000, 4000);
    expect(size).toEqual({ width: 50, height: 200 });
  });

  it("never returns a zero dimension", () => {
    const size = computeSampleSize(4000, 3);
    expect(size.height).toBeGreaterThanOrEqual(1);
  });
});

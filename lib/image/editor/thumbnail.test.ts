import { describe, expect, it } from "vitest";

import { thumbnailScale, THUMBNAIL_SIZE } from "@/lib/image/editor/thumbnail";

describe("thumbnailScale", () => {
  it("fits the longest side to the thumbnail", () => {
    expect(thumbnailScale(640, 320)).toBe(THUMBNAIL_SIZE / 640);
    expect(thumbnailScale(100, 400, 50)).toBe(0.125);
  });

  it("never divides by zero for an empty layer", () => {
    expect(thumbnailScale(0, 0, 64)).toBe(64);
  });
});

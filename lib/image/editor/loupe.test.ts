import { describe, expect, it } from "vitest";

import {
  LOUPE_BOX,
  loupePlacement,
  loupeSource,
  pixelColour,
} from "@/lib/image/editor/loupe";

/** A stand-in context holding one 2 × 1 row: opaque red, then fully clear. */
const pixels = {
  getImageData: (x: number) =>
    ({
      data: Uint8ClampedArray.from(x === 0 ? [255, 0, 0, 255] : [0, 0, 0, 0]),
    }) as ImageData,
};
const DOC = { width: 2, height: 1 };

describe("eyedropper loupe", () => {
  it("centres the magnified square on the pixel under the pointer", () => {
    expect(loupeSource({ x: 20.7, y: 5.2 })).toEqual({ x: 15, y: 0 });
  });

  it("sits below and right of the pointer when there is room", () => {
    expect(
      loupePlacement({ x: 100, y: 100 }, { width: 1000, height: 800 }),
    ).toEqual({
      left: 120,
      top: 120,
    });
  });

  it("flips to the other side near the right and bottom edges", () => {
    const host = { width: 1000, height: 800 };
    expect(loupePlacement({ x: 950, y: 780 }, host)).toEqual({
      left: 950 - 20 - LOUPE_BOX.width,
      top: 780 - 20 - LOUPE_BOX.height,
    });
  });

  it("reads an opaque pixel as hex, and nothing for clear or off-canvas pixels", () => {
    expect(pixelColour(pixels, DOC, { x: 0.5, y: 0.5 })).toBe("#ff0000");
    expect(pixelColour(pixels, DOC, { x: 1.5, y: 0.5 })).toBeNull();
    expect(pixelColour(pixels, DOC, { x: -1, y: 0 })).toBeNull();
    expect(pixelColour(pixels, DOC, { x: 0, y: 1 })).toBeNull();
  });
});

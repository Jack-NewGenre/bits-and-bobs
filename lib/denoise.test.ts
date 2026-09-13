import { describe, expect, it } from "vitest";

import { medianDenoise } from "@/lib/denoise";

/** Build a `width` x `height` greyscale RGBA buffer from a value grid. */
function grid(values: number[][]): {
  data: Uint8ClampedArray;
  width: number;
  height: number;
} {
  const height = values.length;
  const width = values[0].length;
  const data = new Uint8ClampedArray(width * height * 4);
  values.flat().forEach((value, index) => {
    data[index * 4] = value;
    data[index * 4 + 1] = value;
    data[index * 4 + 2] = value;
    data[index * 4 + 3] = 255;
  });
  return { data, width, height };
}

const centreOf = (data: Uint8ClampedArray, width: number) =>
  data[(width + 1) * 4];

describe("medianDenoise", () => {
  it("removes an isolated speck", () => {
    const { data, width, height } = grid([
      [10, 10, 10],
      [10, 250, 10],
      [10, 10, 10],
    ]);
    const out = medianDenoise(data, width, height, 1);
    expect(centreOf(out, width)).toBe(10);
  });

  it("preserves an edge instead of smearing it", () => {
    // Left half dark, right half bright: the centre sits on the bright side.
    const { data, width, height } = grid([
      [0, 200, 200],
      [0, 200, 200],
      [0, 200, 200],
    ]);
    const out = medianDenoise(data, width, height, 1);
    expect(centreOf(out, width)).toBe(200);
  });

  it("blends towards the original at partial strength", () => {
    const { data, width, height } = grid([
      [10, 10, 10],
      [10, 250, 10],
      [10, 10, 10],
    ]);
    const out = medianDenoise(data, width, height, 0.5);
    // 250 + (10 - 250) * 0.5 = 130
    expect(centreOf(out, width)).toBe(130);
  });

  it("is a no-op at zero strength and never mutates the input", () => {
    const { data, width, height } = grid([
      [10, 10, 10],
      [10, 250, 10],
      [10, 10, 10],
    ]);
    const out = medianDenoise(data, width, height, 0);
    expect(Array.from(out)).toEqual(Array.from(data));
    expect(centreOf(data, width)).toBe(250);
  });

  it("leaves alpha untouched", () => {
    const { data, width, height } = grid([
      [10, 10, 10],
      [10, 250, 10],
      [10, 10, 10],
    ]);
    data[(width + 1) * 4 + 3] = 40;
    const out = medianDenoise(data, width, height, 1);
    expect(out[(width + 1) * 4 + 3]).toBe(40);
  });
});

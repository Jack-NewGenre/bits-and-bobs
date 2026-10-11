import { describe, expect, it } from "vitest";

import { contentAwareFill } from "@/lib/image/editor/content-aware";
import type { PixelGrid } from "@/lib/image/editor/pixels";

type Rgba = [number, number, number, number];

const RED: Rgba = [220, 30, 40, 255];
const BLUE: Rgba = [20, 60, 200, 255];
const STRIPE = 3;

function makeImage(
  width: number,
  height: number,
  paint: (x: number, y: number) => Rgba,
) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) data.set(paint(x, y), (y * width + x) * 4);
  }
  return { data, width, height } satisfies PixelGrid;
}

function squareHole(
  image: PixelGrid,
  x0: number,
  y0: number,
  size: number,
): Uint8Array {
  const hole = new Uint8Array(image.width * image.height);
  for (let y = y0; y < y0 + size; y++) {
    for (let x = x0; x < x0 + size; x++) hole[y * image.width + x] = 255;
  }
  return hole;
}

const stripeAt = (x: number): Rgba =>
  Math.floor(x / STRIPE) % 2 === 0 ? RED : BLUE;

function pixel(data: Uint8ClampedArray, i: number): Rgba {
  return [data[i * 4], data[i * 4 + 1], data[i * 4 + 2], data[i * 4 + 3]];
}

const near = (a: Rgba, b: Rgba, tolerance = 2) =>
  a.every((v, c) => Math.abs(v - b[c]) <= tolerance);

describe("contentAwareFill", () => {
  it("leaves every pixel outside the hole unchanged", () => {
    const image = makeImage(40, 32, (x, y) => [
      x * 6,
      y * 7,
      (x * y) % 255,
      255,
    ]);
    const hole = squareHole(image, 14, 10, 8);
    const out = contentAwareFill(image, hole, { seed: 3 });
    for (let i = 0; i < hole.length; i++) {
      if (!hole[i]) expect(pixel(out, i)).toEqual(pixel(image.data, i));
    }
  });

  it("fills a hole in a flat colour with that colour", () => {
    const image = makeImage(32, 32, () => [90, 140, 60, 255]);
    const hole = squareHole(image, 10, 10, 10);
    const out = contentAwareFill(image, hole);
    for (let i = 0; i < hole.length; i++) {
      if (hole[i]) expect(pixel(out, i)).toEqual([90, 140, 60, 255]);
    }
  });

  it("fills a hole in vertical stripes with stripe colours that continue the stripes", () => {
    const image = makeImage(48, 40, (x) => stripeAt(x));
    const hole = squareHole(image, 18, 14, 10);
    const out = contentAwareFill(image, hole, { seed: 5 });
    let filled = 0;
    let continued = 0;
    for (let i = 0; i < hole.length; i++) {
      if (!hole[i]) continue;
      const colour = pixel(out, i);
      expect(near(colour, RED) || near(colour, BLUE)).toBe(true);
      filled++;
      if (near(colour, stripeAt(i % image.width))) continued++;
    }
    expect(continued / filled).toBeGreaterThan(0.9);
  });

  it("keeps an opaque area opaque beside a transparent one", () => {
    const image = makeImage(40, 40, (x) =>
      x < 12 ? [0, 0, 0, 0] : [200, 180, 20, 255],
    );
    const hole = squareHole(image, 20, 15, 8);
    const out = contentAwareFill(image, hole);
    for (let i = 0; i < hole.length; i++) {
      if (hole[i]) expect(pixel(out, i)).toEqual([200, 180, 20, 255]);
    }
  });

  it("leaves a hole in an empty area of a layer empty", () => {
    const INK: Rgba = [20, 24, 40, 255];
    const image = makeImage(48, 48, (x, y) =>
      x < 16 && y < 16 ? INK : [0, 0, 0, 0],
    );
    const hole = squareHole(image, 28, 28, 10);
    const out = contentAwareFill(image, hole);
    for (let i = 0; i < hole.length; i++)
      if (hole[i]) expect(pixel(out, i)[3]).toBe(0);
  });

  it("returns an unchanged copy for an empty hole", () => {
    const image = makeImage(16, 16, (x, y) => [x * 10, y * 10, 0, 255]);
    const out = contentAwareFill(image, new Uint8Array(16 * 16).fill(127));
    expect(out).not.toBe(image.data);
    expect(out).toEqual(image.data);
  });

  it("is deterministic for the same seed", () => {
    const image = makeImage(40, 40, (x, y) => [
      (x * 37 + y * 11) % 256,
      (x * y) % 256,
      y * 5,
      255,
    ]);
    const hole = squareHole(image, 15, 15, 9);
    const first = contentAwareFill(image, hole, { seed: 42 });
    const second = contentAwareFill(image, hole, { seed: 42 });
    expect(second).toEqual(first);
  });

  it("reports progress that rises to 1", () => {
    const image = makeImage(80, 80, (x) => stripeAt(x));
    const hole = squareHole(image, 30, 30, 20);
    const fractions: number[] = [];
    contentAwareFill(image, hole, {
      onProgress: (fraction) => fractions.push(fraction),
    });
    expect(fractions.length).toBeGreaterThan(1);
    expect(fractions.at(-1)).toBe(1);
    for (let i = 1; i < fractions.length; i++) {
      expect(fractions[i]).toBeGreaterThanOrEqual(fractions[i - 1]);
    }
  });
});

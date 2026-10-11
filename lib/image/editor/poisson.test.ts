import { describe, expect, it } from "vitest";

import { healPixels, type HealInput } from "@/lib/image/editor/poisson";

type Rgba = [number, number, number, number];

function fill(
  width: number,
  height: number,
  colour: (x: number, y: number) => Rgba,
) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++)
      pixels.set(colour(x, y), (y * width + x) * 4);
  }
  return pixels;
}

function disc(
  width: number,
  height: number,
  cx: number,
  cy: number,
  r: number,
  value = 255,
) {
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (Math.hypot(x - cx, y - cy) <= r) mask[y * width + x] = value;
    }
  }
  return mask;
}

function setup(overrides: Partial<HealInput> = {}): HealInput {
  const width = 64;
  const height = 48;
  return {
    width,
    height,
    target: fill(width, height, (x, y) => [40 + x, 90 + y, 200 - x, 255]),
    source: fill(width, height, (x, y) => [
      (x * 37 + y * 11) % 256,
      (x * y) % 256,
      128,
      255,
    ]),
    mask: disc(width, height, 32, 24, 12),
    ...overrides,
  };
}

/** Pixel indices within `r` of a centre. */
function inside(
  width: number,
  height: number,
  cx: number,
  cy: number,
  r: number,
) {
  const pixels: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (Math.hypot(x - cx, y - cy) <= r) pixels.push(y * width + x);
    }
  }
  return pixels;
}

describe("healPixels", () => {
  it("returns a copy of the target for an empty mask", () => {
    const input = setup({ mask: new Uint8Array(64 * 48) });
    const out = healPixels(input);
    expect(out).toEqual(input.target);
    expect(out).not.toBe(input.target);
  });

  it("leaves every pixel outside the mask untouched", () => {
    const input = setup();
    const out = healPixels(input);
    for (let i = 0; i < input.mask.length; i++) {
      if (input.mask[i]) continue;
      expect(Array.from(out.subarray(i * 4, i * 4 + 4))).toEqual(
        Array.from(input.target.subarray(i * 4, i * 4 + 4)),
      );
    }
  });

  it("relights a flat source to the flat target's colour", () => {
    const input = setup({
      target: fill(64, 48, () => [30, 120, 220, 255]),
      source: fill(64, 48, () => [200, 50, 50, 255]),
    });
    const out = healPixels(input);
    for (const i of inside(64, 48, 32, 24, 12)) {
      expect(Math.abs(out[i * 4] - 30)).toBeLessThanOrEqual(1);
      expect(Math.abs(out[i * 4 + 1] - 120)).toBeLessThanOrEqual(1);
      expect(Math.abs(out[i * 4 + 2] - 220)).toBeLessThanOrEqual(1);
    }
  });

  it("keeps the source's texture while matching the target's colour", () => {
    const stripe = (x: number) => 20 * Math.sin((x * 2 * Math.PI) / 8);
    const input = setup({
      width: 96,
      height: 96,
      target: fill(96, 96, () => [100, 100, 100, 255]),
      source: fill(96, 96, (x) => [180 + stripe(x), 60, 60, 255]),
      mask: disc(96, 96, 48, 48, 30),
    });
    const out = healPixels(input);
    const core = inside(96, 96, 48, 48, 15);

    const mean = core.reduce((sum, i) => sum + out[i * 4], 0) / core.length;
    expect(Math.abs(mean - 100)).toBeLessThan(3);

    let worst = 0;
    for (const i of core) {
      const healed = out[(i + 1) * 4] - out[i * 4];
      const original = input.source[(i + 1) * 4] - input.source[i * 4];
      worst = Math.max(worst, Math.abs(healed - original));
    }
    expect(worst).toBeLessThanOrEqual(2);
  });

  it("never changes alpha", () => {
    const input = setup({
      target: fill(64, 48, (x, y) => [10, 20, 30, (x * 4 + y) % 256]),
      source: fill(64, 48, () => [200, 200, 200, 255]),
    });
    const out = healPixels(input);
    for (let i = 3; i < out.length; i += 4)
      expect(out[i]).toBe(input.target[i]);
  });

  it("blends a soft mask between the target and the fully healed result", () => {
    const full = healPixels(setup());
    const input = setup({ mask: disc(64, 48, 32, 24, 12, 128) });
    const half = healPixels(input);
    for (const i of inside(64, 48, 32, 24, 12)) {
      for (let c = 0; c < 3; c++) {
        const p = i * 4 + c;
        const expected =
          input.target[p] + ((full[p] - input.target[p]) * 128) / 255;
        expect(Math.abs(half[p] - expected)).toBeLessThanOrEqual(1);
      }
    }
  });

  it("falls back to the source when the mask leaves no boundary", () => {
    const input = setup({ mask: new Uint8Array(64 * 48).fill(255) });
    expect(healPixels(input)).toEqual(input.source);
  });

  it("heals a large area quickly", () => {
    const size = 420;
    const input = setup({
      width: size,
      height: size,
      target: fill(size, size, (x, y) => [x % 256, y % 256, 90, 255]),
      source: fill(size, size, (x, y) => [
        (x * 3) % 256,
        (y * 5) % 256,
        30,
        255,
      ]),
      mask: disc(size, size, 210, 210, 200),
    });
    const start = performance.now();
    healPixels(input);
    expect(performance.now() - start).toBeLessThan(2000);
  });
});

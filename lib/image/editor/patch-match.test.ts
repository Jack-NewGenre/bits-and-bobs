import { describe, expect, it } from "vitest";

import {
  buildLevel,
  createRandom,
  fieldCosts,
  patchDistance,
  patchMatchPass,
  randomField,
  vote,
} from "@/lib/image/editor/patch-match";

/** A 20×20 level of horizontal gradient with a 4×4 hole in the middle. */
function gradientLevel(radius = 1) {
  const width = 20;
  const height = 20;
  const colour = new Float32Array(width * height * 4);
  const hole = new Uint8Array(width * height);
  const sourceOk = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      colour.set([x * 10, 50, 100, 255], i * 4);
      hole[i] = x >= 8 && x < 12 && y >= 8 && y < 12 ? 1 : 0;
      sourceOk[i] = hole[i] ? 0 : 1;
    }
  }
  return buildLevel(width, height, radius, colour, hole, sourceOk);
}

describe("createRandom", () => {
  it("repeats for a seed and stays in [0, 1)", () => {
    const a = createRandom(9);
    const b = createRandom(9);
    for (let i = 0; i < 100; i++) {
      const value = a();
      expect(value).toBe(b());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("buildLevel", () => {
  it("keeps source centres clear of the hole and the border", () => {
    const level = gradientLevel();
    for (const c of level.centres) {
      const x = c % level.width;
      const y = Math.floor(c / level.width);
      expect(x).toBeGreaterThanOrEqual(1);
      expect(x).toBeLessThan(level.width - 1);
      expect(x >= 7 && x <= 12 && y >= 7 && y <= 12).toBe(false);
    }
  });

  it("targets every centre whose patch touches the hole", () => {
    const level = gradientLevel();
    expect(level.targets.length).toBe(6 * 6);
    expect(level.isTarget[7 * 20 + 7]).toBe(1);
    expect(level.isTarget[6 * 20 + 6]).toBe(0);
  });
});

describe("patchDistance", () => {
  it("is zero between identical patches and grows with difference", () => {
    const level = gradientLevel();
    expect(patchDistance(level, 3 * 20 + 4, 15 * 20 + 4)).toBe(0);
    expect(patchDistance(level, 3 * 20 + 4, 3 * 20 + 6)).toBeGreaterThan(0);
  });
});

describe("patchMatchPass and vote", () => {
  it("lowers the total cost and fills the hole with source colours", () => {
    const level = gradientLevel();
    const random = createRandom(1);
    const field = randomField(level, random);
    const before = fieldCosts(level, field).reduce((sum, c) => sum + c, 0);
    let cost = fieldCosts(level, field);
    for (let pass = 0; pass < 6; pass++) {
      patchMatchPass(level, field, cost, pass % 2 === 1, random);
      vote(level, field, cost);
      cost = fieldCosts(level, field);
    }
    expect(cost.reduce((sum, c) => sum + c, 0)).toBeLessThan(before);
    for (let i = 0; i < level.hole.length; i++) {
      if (level.hole[i]) expect(level.colour[i * 4 + 3]).toBeCloseTo(255);
    }
  });
});

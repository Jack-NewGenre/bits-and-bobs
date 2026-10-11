import { describe, expect, it } from "vitest";

import { rgbToOklch } from "@/lib/colour/colour";
import {
  buildHarmony,
  buildShades,
  HARMONIES,
  randomBaseColour,
  SHADE_STEPS,
} from "@/lib/colour/colour-harmony";

const BLUE = { r: 59, g: 130, b: 246, a: 1 };

const harmony = (id: string) => HARMONIES.find((entry) => entry.id === id)!;

describe("buildHarmony", () => {
  it("returns one colour per offset", () => {
    for (const entry of HARMONIES) {
      const colours = buildHarmony(BLUE, entry);
      expect(colours.length).toBeGreaterThan(0);
      if (entry.id !== "monochromatic") {
        expect(colours).toHaveLength(entry.offsets.length);
      }
    }
  });

  it("puts the complement half a turn away", () => {
    const [base, complement] = buildHarmony(BLUE, harmony("complementary"));
    const from = rgbToOklch(base).h;
    const to = rgbToOklch(complement).h;
    const turn = (((to - from) % 360) + 360) % 360;
    expect(Math.abs(turn - 180)).toBeLessThan(2);
  });

  it("keeps the perceived lightness steady across a rotation", () => {
    const lightnesses = buildHarmony(BLUE, harmony("triadic")).map(
      (colour) => rgbToOklch(colour).l,
    );
    const spread = Math.max(...lightnesses) - Math.min(...lightnesses);
    // Rotating hue in HSL would swing this wildly; in OKLCH it barely moves.
    expect(spread).toBeLessThan(0.06);
  });

  it("varies lightness, not hue, for a monochromatic set", () => {
    const colours = buildHarmony(BLUE, harmony("monochromatic"));
    const hues = colours.map((colour) => rgbToOklch(colour).h);
    expect(Math.max(...hues) - Math.min(...hues)).toBeLessThan(2);

    const lightnesses = colours.map((colour) => rgbToOklch(colour).l);
    expect(lightnesses).toEqual([...lightnesses].sort((a, b) => a - b));
  });
});

describe("randomBaseColour", () => {
  it("stays within a usable lightness and chroma", () => {
    for (const pin of [0, 0.5, 0.999]) {
      const { l, c } = rgbToOklch(randomBaseColour(() => pin));
      expect(l).toBeGreaterThan(0.45);
      expect(l).toBeLessThan(0.85);
      expect(c).toBeGreaterThan(0.05);
    }
  });

  it("follows the random source it is given", () => {
    expect(randomBaseColour(() => 0.3)).toEqual(randomBaseColour(() => 0.3));
    expect(randomBaseColour(() => 0.3)).not.toEqual(
      randomBaseColour(() => 0.7),
    );
  });
});

describe("buildShades", () => {
  it("produces the full Tailwind scale", () => {
    expect(buildShades(BLUE).map((shade) => shade.step)).toEqual([
      ...SHADE_STEPS,
    ]);
  });

  it("runs light to dark", () => {
    const lightnesses = buildShades(BLUE).map(
      (shade) => rgbToOklch(shade.colour).l,
    );
    expect(lightnesses).toEqual([...lightnesses].sort((a, b) => b - a));
  });

  it("keeps the hue of the colour it was given", () => {
    const hue = rgbToOklch(BLUE).h;
    for (const shade of buildShades(BLUE)) {
      // Near-white and near-black steps carry almost no chroma, so their hue
      // is meaningless, so only check the ones with colour in them.
      if (rgbToOklch(shade.colour).c < 0.02) continue;
      expect(Math.abs(rgbToOklch(shade.colour).h - hue)).toBeLessThan(2);
    }
  });

  it("marks exactly one step as where the given colour landed", () => {
    const marked = buildShades(BLUE).filter((shade) => shade.isBase);
    expect(marked).toHaveLength(1);
  });

  it("marks a light colour near the top of the scale and a dark one near the bottom", () => {
    const light = buildShades({ r: 219, g: 234, b: 254, a: 1 }).find(
      (shade) => shade.isBase,
    )!;
    const dark = buildShades({ r: 23, g: 37, b: 84, a: 1 }).find(
      (shade) => shade.isBase,
    )!;
    expect(light.step).toBeLessThanOrEqual(200);
    expect(dark.step).toBeGreaterThanOrEqual(900);
  });

  it("keeps a grey grey at every step", () => {
    for (const shade of buildShades({ r: 128, g: 128, b: 128, a: 1 })) {
      expect(rgbToOklch(shade.colour).c).toBeLessThan(0.01);
    }
  });
});

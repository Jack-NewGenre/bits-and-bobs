/**
 * Colour harmonies and Tailwind-style shade ramps.
 *
 * Harmonies are rotations around the hue wheel: pick one colour, and the
 * others are found at fixed angles from it. The rotation happens in OKLCH
 * rather than HSL, so every result keeps the perceived lightness of the one
 * you chose instead of a yellow coming out far brighter than its blue.
 */

import { oklchToRgbInGamut, rgbToOklch, type Rgb } from "@/lib/colour/colour";
import { clamp } from "@/lib/utils";
import { formatHex, formatOklch } from "@/lib/colour/colour-format";

export type HarmonyId =
  | "complementary"
  | "analogous"
  | "triadic"
  | "tetradic"
  | "split"
  | "rectangle"
  | "double-split"
  | "compound"
  | "golden"
  | "monochromatic";

export interface Harmony {
  id: HarmonyId;
  label: string;
  /** Hue rotations in degrees, applied to the chosen colour. */
  offsets: number[];
  description: string;
}

export const HARMONIES: Harmony[] = [
  {
    id: "complementary",
    label: "Complementary",
    offsets: [0, 180],
    description: "Opposite hues: maximum contrast, good for a single accent.",
  },
  {
    id: "analogous",
    label: "Analogous",
    offsets: [-60, -30, 0, 30, 60],
    description: "Neighbouring hues: calm and cohesive, low tension.",
  },
  {
    id: "triadic",
    label: "Triadic",
    offsets: [0, 120, 240],
    description: "Evenly spaced: vivid and balanced, hard to overdo.",
  },
  {
    id: "tetradic",
    label: "Tetradic",
    offsets: [0, 90, 180, 270],
    description: "Two complementary pairs: rich, but needs one to dominate.",
  },
  {
    id: "split",
    label: "Split",
    offsets: [0, 150, 210],
    description: "A softened complementary: contrast without the clash.",
  },
  {
    id: "rectangle",
    label: "Rectangle",
    offsets: [0, 60, 180, 240],
    description:
      "Two close pairs facing each other: richer than complementary, calmer than tetradic.",
  },
  {
    id: "double-split",
    label: "Double split",
    offsets: [0, -30, 30, 150, 210],
    description:
      "A small analogous group set against both neighbours of its complement.",
  },
  {
    id: "compound",
    label: "Compound",
    offsets: [0, 30, 165, 195],
    description:
      "A colour and its neighbour, each with an accent from across the wheel.",
  },
  {
    id: "golden",
    label: "Golden",
    offsets: [0, 137.5, 275, 52.5, 190],
    description:
      "Steps of the golden angle: hues that never quite repeat, as in a sunflower head.",
  },
  {
    id: "monochromatic",
    label: "Monochromatic",
    offsets: [0],
    description:
      "One hue at several lightnesses: quiet and unmistakably one family.",
  },
];

/** Lightness steps used by the monochromatic harmony. */
const MONO_LIGHTNESS = [0.35, 0.5, 0.62, 0.74, 0.86];

/** Build the palette a harmony produces from a base colour. */
export function buildHarmony(base: Rgb, harmony: Harmony): Rgb[] {
  const { l, c, h, a } = rgbToOklch(base);

  if (harmony.id === "monochromatic") {
    return MONO_LIGHTNESS.map((lightness) =>
      oklchToRgbInGamut({ l: lightness, c, h, a }),
    );
  }

  return harmony.offsets.map((offset) =>
    oklchToRgbInGamut({ l, c, h: (((h + offset) % 360) + 360) % 360, a }),
  );
}

/**
 * A random colour that is pleasant to build a palette on: never muddy, never
 * washed out, never so dark its neighbours turn black. `random` is injectable
 * so tests can pin it.
 */
export function randomBaseColour(random: () => number = Math.random): Rgb {
  return oklchToRgbInGamut({
    l: 0.5 + random() * 0.3,
    c: 0.08 + random() * 0.12,
    h: random() * 360,
    a: 1,
  });
}

export const SHADE_STEPS = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;

export type ShadeStep = (typeof SHADE_STEPS)[number];

/**
 * Target lightness for each step, and how much of the base colour's chroma to
 * keep. The near-white and near-black ends carry far less chroma, which is
 * what stops a 50 from looking like a washed-out version of the 500 and keeps
 * a 950 from turning muddy.
 */
const RAMP: Record<ShadeStep, { l: number; c: number }> = {
  50: { l: 0.971, c: 0.09 },
  100: { l: 0.94, c: 0.18 },
  200: { l: 0.892, c: 0.35 },
  300: { l: 0.82, c: 0.56 },
  400: { l: 0.724, c: 0.82 },
  500: { l: 0.637, c: 1 },
  600: { l: 0.567, c: 0.98 },
  700: { l: 0.49, c: 0.87 },
  800: { l: 0.42, c: 0.72 },
  900: { l: 0.363, c: 0.6 },
  950: { l: 0.267, c: 0.47 },
};

export interface Shade {
  step: ShadeStep;
  colour: Rgb;
  /** True for the step the supplied colour sits closest to. */
  isBase: boolean;
}

/**
 * Generate a full 50–950 scale from one colour, keeping its hue and using its
 * chroma as the peak. The step whose lightness is nearest the input is marked
 * so the UI can show where the colour you gave it landed.
 */
export function buildShades(base: Rgb): Shade[] {
  const { l, c, h, a } = rgbToOklch(base);

  const nearest = SHADE_STEPS.reduce((best, step) =>
    Math.abs(RAMP[step].l - l) < Math.abs(RAMP[best].l - l) ? step : best,
  );

  return SHADE_STEPS.map((step) => ({
    step,
    colour: oklchToRgbInGamut({
      l: RAMP[step].l,
      c: clamp(c * RAMP[step].c, 0, 0.4),
      h,
      a,
    }),
    isBase: step === nearest,
  }));
}

/** A Tailwind v4 `@theme` block, which is how v4 expects custom colours. */
export function toThemeBlock(name: string, shades: Shade[]) {
  const safeName =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "brand";
  const lines = shades.map(
    (shade) =>
      `  --color-${safeName}-${shade.step}: ${formatOklch(shade.colour)};`,
  );
  return `@theme {\n${lines.join("\n")}\n}`;
}

export function toHexList(name: string, shades: Shade[]) {
  const safeName = name.trim() || "brand";
  const lines = shades.map(
    (shade) => `  ${shade.step}: "${formatHex(shade.colour)}",`,
  );
  return `${safeName}: {\n${lines.join("\n")}\n}`;
}

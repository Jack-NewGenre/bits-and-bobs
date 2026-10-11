/**
 * Plain-language facts about one colour, for the Colour Atlas. The hue bins
 * are measured in OKLCH, so "blue" means what the eye sees, not an HSL wedge.
 */

import { rgbToOklch, type Oklch, type Rgb } from "@/lib/colour/colour";
import { bestTextOn, relativeLuminance } from "@/lib/colour/colour-contrast";

/** Upper OKLCH hue bound for each name. Pink wraps round past 360 into the reds. */
const HUE_BINS: [number, string][] = [
  [12, "pink"],
  [45, "red"],
  [80, "orange"],
  [120, "yellow"],
  [170, "green"],
  [215, "cyan"],
  [285, "blue"],
  [315, "violet"],
  [345, "purple"],
  [360, "pink"],
];

/** Below this chroma a colour reads as grey whatever its hue. */
const NEUTRAL_CHROMA = 0.03;

function neutralName(lightness: number): string {
  if (lightness > 0.95) return "white";
  if (lightness < 0.15) return "black";
  if (lightness < 0.45) return "dark grey";
  return lightness > 0.8 ? "light grey" : "grey";
}

/** A short everyday name for a colour, e.g. "dark blue" or "light pink". */
export function colourName(colour: Rgb): string {
  const { l, c, h } = rgbToOklch(colour);
  if (c < NEUTRAL_CHROMA) return neutralName(l);

  const hue = HUE_BINS.find(([bound]) => h < bound)?.[1] ?? "pink";
  // Darkened orange and yellow stop looking like either.
  if (hue === "orange" && l < 0.6) return "brown";
  if (hue === "yellow" && l < 0.65) return "olive";

  if (l < 0.45) return `dark ${hue}`;
  if (l > 0.85 && c < 0.15) return `light ${hue}`;
  if (c < 0.08) return `muted ${hue}`;
  return hue;
}

export interface ColourFacts {
  name: string;
  oklch: Oklch;
  /** WCAG relative luminance, 0–1. */
  luminance: number;
  /** Whether text on it should be white or black. */
  textOn: "white" | "black";
}

export function describeColour(colour: Rgb): ColourFacts {
  return {
    name: colourName(colour),
    oklch: rgbToOklch(colour),
    luminance: relativeLuminance(colour),
    textOn: bestTextOn(colour).r === 255 ? "white" : "black",
  };
}

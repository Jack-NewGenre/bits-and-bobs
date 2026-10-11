/**
 * Hue/Saturation for one colour range at a time (reds, yellows, greens, cyans,
 * blues, magentas), as in Photoshop. Each range is fully on for 30° around its
 * centre and fades over 30° either side. Adapted from PhotoCraft's `HueRange`
 * and `hue_saturation` (MIT OR Apache-2.0, see THIRD_PARTY_NOTICES.md).
 */

export const COLOUR_RANGES = [
  "reds",
  "yellows",
  "greens",
  "cyans",
  "blues",
  "magentas",
] as const;
export type ColourRange = (typeof COLOUR_RANGES)[number];

export interface RangeShift {
  /** Degrees, −180–180. */
  hue: number;
  /** −100–100. */
  saturation: number;
  /** −100–100. */
  lightness: number;
}

export type RangeShifts = Record<ColourRange, RangeShift>;

export const NEUTRAL_SHIFT: RangeShift = {
  hue: 0,
  saturation: 0,
  lightness: 0,
};

export const NEUTRAL_RANGES: RangeShifts = Object.fromEntries(
  COLOUR_RANGES.map((range) => [range, NEUTRAL_SHIFT]),
) as RangeShifts;

export function isNeutralShift({
  hue,
  saturation,
  lightness,
}: RangeShift): boolean {
  return hue === 0 && saturation === 0 && lightness === 0;
}

/** How much a hue (degrees) belongs to range `index` (0 = reds), 0–1. */
export function rangeWeight(index: number, degrees: number): number {
  const distance = Math.abs(((degrees - index * 60 + 540) % 360) - 180);
  return Math.min(1, Math.max(0, (45 - distance) / 30));
}

export function rgbToHsl(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d < 1e-7) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r
      ? ((((g - b) / d) % 6) + 6) % 6
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  return [h / 6, s, l];
}

export function hslToRgb(
  h: number,
  s: number,
  l: number,
): [number, number, number] {
  if (s <= 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    const u = ((t % 1) + 1) % 1;
    if (u < 1 / 6) return p + (q - p) * 6 * u;
    if (u < 1 / 2) return q;
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
    return p;
  };
  return [channel(h + 1 / 3), channel(h), channel(h - 1 / 3)];
}

/**
 * Shifts one 0–1 colour by the ranges its hue falls in. The shift fades with
 * the colour's chroma, so greys and near-greys are left alone.
 */
export function shiftByRange(
  rgb: [number, number, number],
  shifts: RangeShifts,
): [number, number, number] {
  const [h, s, l] = rgbToHsl(...rgb);
  const chroma = Math.max(...rgb) - Math.min(...rgb);
  if (chroma < 1e-7) return rgb;
  const [dh, ds, dl] = COLOUR_RANGES.reduce(
    (sum, range, index) => {
      const weight = rangeWeight(index, h * 360) * chroma;
      const shift = shifts[range];
      return [
        sum[0] + weight * shift.hue,
        sum[1] + (weight * shift.saturation) / 100,
        sum[2] + (weight * shift.lightness) / 100,
      ];
    },
    [0, 0, 0],
  );
  const out = hslToRgb(
    (((h + dh / 360) % 1) + 1) % 1,
    Math.min(1, Math.max(0, s * (1 + ds))),
    l,
  );
  return dl > 0
    ? (out.map((v) => v + (1 - v) * dl) as [number, number, number])
    : (out.map((v) => v * (1 + dl)) as [number, number, number]);
}

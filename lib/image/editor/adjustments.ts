/**
 * Non-destructive image adjustments. The settings are kept on the layer and
 * turned into Fabric filters each time they change, so an adjustment can be
 * dialled back at any point, or reset, without the original pixels being lost.
 */

import { filters, type FabricImage } from "fabric";

import { IDENTITY_CURVE, isIdentityCurve } from "@/lib/image/editor/curves";
import {
  COLOUR_RANGES,
  isNeutralShift,
  NEUTRAL_RANGES,
  type RangeShifts,
} from "@/lib/image/editor/hue-ranges";
import type { Point2D } from "@/lib/image/editor/shapes";
import { CurveFilter, HueRangeFilter } from "@/lib/image/editor/tone-filters";

export interface Adjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  vibrance: number;
  hue: number;
  temperature: number;
  tint: number;
  blackPoint: number;
  midtones: number;
  whitePoint: number;
  sharpen: number;
  blur: number;
  noise: number;
  pixelate: number;
  greyscale: boolean;
  sepia: boolean;
  invert: boolean;
  /** Master RGB tone curve, points 0–1. */
  curve: Point2D[];
  /** Hue/Saturation for each colour range. */
  colourRanges: RangeShifts;
}

export type SliderAdjustment = {
  [K in keyof Adjustments]: Adjustments[K] extends number ? K : never;
}[keyof Adjustments];

export type ToggleAdjustment = {
  [K in keyof Adjustments]: Adjustments[K] extends boolean ? K : never;
}[keyof Adjustments];

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  vibrance: 0,
  hue: 0,
  temperature: 0,
  tint: 0,
  blackPoint: 0,
  midtones: 0,
  whitePoint: 255,
  sharpen: 0,
  blur: 0,
  noise: 0,
  pixelate: 0,
  greyscale: false,
  sepia: false,
  invert: false,
  curve: [...IDENTITY_CURVE],
  colourRanges: NEUTRAL_RANGES,
};

export interface SliderSpec {
  key: SliderAdjustment;
  label: string;
  min: number;
  max: number;
}

/** The sliders, grouped the way the panel shows them. */
export const ADJUSTMENT_GROUPS: readonly {
  title: string;
  sliders: readonly SliderSpec[];
}[] = [
  {
    title: "Light",
    sliders: [
      { key: "brightness", label: "Brightness", min: -100, max: 100 },
      { key: "contrast", label: "Contrast", min: -100, max: 100 },
    ],
  },
  {
    title: "Levels",
    sliders: [
      { key: "blackPoint", label: "Black point", min: 0, max: 254 },
      { key: "midtones", label: "Midtones", min: -100, max: 100 },
      { key: "whitePoint", label: "White point", min: 1, max: 255 },
    ],
  },
  {
    title: "Colour",
    sliders: [
      { key: "temperature", label: "Temperature", min: -100, max: 100 },
      { key: "tint", label: "Tint", min: -100, max: 100 },
      { key: "saturation", label: "Saturation", min: -100, max: 100 },
      { key: "vibrance", label: "Vibrance", min: -100, max: 100 },
      { key: "hue", label: "Hue", min: -180, max: 180 },
    ],
  },
  {
    title: "Effects",
    sliders: [
      { key: "sharpen", label: "Sharpen", min: 0, max: 100 },
      { key: "blur", label: "Blur", min: 0, max: 100 },
      { key: "noise", label: "Noise", min: 0, max: 100 },
      { key: "pixelate", label: "Pixelate", min: 0, max: 50 },
    ],
  },
];

export const TOGGLE_ADJUSTMENTS: readonly {
  key: ToggleAdjustment;
  label: string;
}[] = [
  { key: "greyscale", label: "Greyscale" },
  { key: "sepia", label: "Sepia" },
  { key: "invert", label: "Invert" },
];

/** Fills in settings a layer saved before newer adjustments existed. */
/** Adjustments as saved by any version: newer settings may be missing. */
export type SavedAdjustments = Partial<Omit<Adjustments, "colourRanges">> & {
  colourRanges?: Partial<RangeShifts>;
};

export function withDefaults(
  adjustments: SavedAdjustments | undefined,
): Adjustments {
  return {
    ...DEFAULT_ADJUSTMENTS,
    ...adjustments,
    colourRanges: { ...NEUTRAL_RANGES, ...adjustments?.colourRanges },
  };
}

export function isNeutral({
  curve,
  colourRanges,
  ...rest
}: Adjustments): boolean {
  return (
    isIdentityCurve(curve) &&
    COLOUR_RANGES.every((range) => isNeutralShift(colourRanges[range])) &&
    (Object.keys(rest) as (keyof typeof rest)[]).every(
      (key) => rest[key] === DEFAULT_ADJUSTMENTS[key],
    )
  );
}

type ImageFilter = FabricImage["filters"][number];

/** A colour matrix that only scales and shifts each channel (shifts are 0–1). */
function channelMatrix(
  scale: number,
  shift: readonly [number, number, number],
): number[] {
  return [
    scale,
    0,
    0,
    0,
    shift[0],
    0,
    scale,
    0,
    0,
    shift[1],
    0,
    0,
    scale,
    0,
    shift[2],
    0,
    0,
    0,
    1,
    0,
  ];
}

/** Stretches the range between the black and white points to fill 0–255. */
export function levelsMatrix(blackPoint: number, whitePoint: number): number[] {
  const span = Math.max(1, whitePoint - blackPoint);
  const scale = 255 / span;
  const shift = -blackPoint / span;
  return channelMatrix(scale, [shift, shift, shift]);
}

/** Warms (positive) or cools a picture by trading red against blue, and tints it green or magenta. */
export function colourBalanceMatrix(
  temperature: number,
  tint: number,
): number[] {
  const warm = (temperature / 100) * 0.12;
  const green = (tint / 100) * 0.1;
  return channelMatrix(1, [warm + green / 2, -green, -warm + green / 2]);
}

/** Fabric's gamma lifts or darkens the midtones, leaving black and white where they are. */
export function midtonesGamma(midtones: number): number {
  return 2 ** (midtones / 50);
}

/** A sharpening kernel, from untouched at 0 to strong at 100. */
export function sharpenKernel(amount: number): number[] {
  const k = amount / 100;
  return [0, -k, 0, -k, 1 + 4 * k, -k, 0, -k, 0];
}

/**
 * Maps the slider values onto Fabric's own ranges. Only adjustments that
 * actually change something become a filter, so an untouched image skips the
 * filter pass altogether.
 */
export function buildFilters(adjustments: SavedAdjustments): ImageFilter[] {
  const a = withDefaults(adjustments);
  const out: ImageFilter[] = [];
  if (a.blackPoint !== 0 || a.whitePoint !== 255) {
    out.push(
      new filters.ColorMatrix({
        matrix: levelsMatrix(a.blackPoint, a.whitePoint),
        colorsOnly: true,
      }),
    );
  }
  if (a.midtones !== 0) {
    const gamma = midtonesGamma(a.midtones);
    out.push(new filters.Gamma({ gamma: [gamma, gamma, gamma] }));
  }
  if (!isIdentityCurve(a.curve)) out.push(new CurveFilter({ points: a.curve }));
  if (a.brightness !== 0)
    out.push(new filters.Brightness({ brightness: a.brightness / 100 }));
  if (a.contrast !== 0)
    out.push(new filters.Contrast({ contrast: a.contrast / 100 }));
  if (a.temperature !== 0 || a.tint !== 0) {
    out.push(
      new filters.ColorMatrix({
        matrix: colourBalanceMatrix(a.temperature, a.tint),
        colorsOnly: true,
      }),
    );
  }
  if (a.saturation !== 0)
    out.push(new filters.Saturation({ saturation: a.saturation / 100 }));
  if (a.vibrance !== 0)
    out.push(new filters.Vibrance({ vibrance: a.vibrance / 100 }));
  if (a.hue !== 0) out.push(new filters.HueRotation({ rotation: a.hue / 180 }));
  if (COLOUR_RANGES.some((range) => !isNeutralShift(a.colourRanges[range]))) {
    out.push(new HueRangeFilter({ shifts: a.colourRanges }));
  }
  if (a.greyscale) out.push(new filters.Grayscale());
  if (a.sepia) out.push(new filters.Sepia());
  if (a.invert) out.push(new filters.Invert());
  if (a.sharpen !== 0)
    out.push(new filters.Convolute({ matrix: sharpenKernel(a.sharpen) }));
  if (a.blur !== 0) out.push(new filters.Blur({ blur: a.blur / 100 }));
  if (a.noise !== 0) out.push(new filters.Noise({ noise: a.noise * 4 }));
  if (a.pixelate > 1) out.push(new filters.Pixelate({ blocksize: a.pixelate }));
  return out;
}

/**
 * Colour parsing, conversion and formatting.
 *
 * Everything is held internally as 8-bit sRGB with an alpha channel, because
 * that is what a canvas, a CSS hex and an <input type="color"> all speak.
 * The other spaces are derived on demand:
 *
 *   - HSL is a cheap reshuffle of RGB, handy for rotating hues.
 *   - OKLCH is perceptually uniform, so equal steps in it look like equal steps
 *     to the eye, which HSL badly fails at. It is what the shade ramps and
 *     harmonies are built on, and what Tailwind v4 emits.
 *
 * Reading and writing the CSS text forms lives in `lib/colour-format`; this
 * module is only the maths. Every function here is pure, so it can be
 * unit-tested without a DOM.
 */

import { clamp } from "@/lib/utils";

export interface Rgb {
  /** 0–255. */
  r: number;
  g: number;
  b: number;
  /** 0–1. */
  a: number;
}

export interface Hsl {
  /** Degrees, 0–360. */
  h: number;
  /** Percent, 0–100. */
  s: number;
  /** Percent, 0–100. */
  l: number;
  a: number;
}

export interface Oklch {
  /** 0–1. */
  l: number;
  /** 0–0.4ish. */
  c: number;
  /** Degrees, 0–360. */
  h: number;
  a: number;
}

export function rgbToHsl({ r, g, b, a }: Rgb): Hsl {
  const [red, green, blue] = [r / 255, g / 255, b / 255];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const span = max - min;
  const lightness = (max + min) / 2;

  if (span === 0) return { h: 0, s: 0, l: lightness * 100, a };

  const saturation = span / (1 - Math.abs(2 * lightness - 1));
  const hue =
    max === red
      ? ((green - blue) / span) % 6
      : max === green
        ? (blue - red) / span + 2
        : (red - green) / span + 4;

  return {
    h: (hue * 60 + 360) % 360,
    s: clamp(saturation * 100, 0, 100),
    l: lightness * 100,
    a,
  };
}

export function hslToRgb({ h, s, l, a }: Hsl): Rgb {
  const saturation = clamp(s, 0, 100) / 100;
  const lightness = clamp(l, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const hue = (((h % 360) + 360) % 360) / 60;
  const second = chroma * (1 - Math.abs((hue % 2) - 1));
  const match = lightness - chroma / 2;

  const [red, green, blue] =
    hue < 1
      ? [chroma, second, 0]
      : hue < 2
        ? [second, chroma, 0]
        : hue < 3
          ? [0, chroma, second]
          : hue < 4
            ? [0, second, chroma]
            : hue < 5
              ? [second, 0, chroma]
              : [chroma, 0, second];

  return {
    r: Math.round((red + match) * 255),
    g: Math.round((green + match) * 255),
    b: Math.round((blue + match) * 255),
    a,
  };
}

/** sRGB channel (0–1) to linear light. */
export function srgbToLinear(channel: number): number {
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

/** Linear light back to an sRGB channel (0–1). */
export function linearToSrgb(channel: number): number {
  return channel <= 0.0031308
    ? channel * 12.92
    : 1.055 * channel ** (1 / 2.4) - 0.055;
}

export function rgbToOklch({ r, g, b, a }: Rgb): Oklch {
  const red = srgbToLinear(r / 255);
  const green = srgbToLinear(g / 255);
  const blue = srgbToLinear(b / 255);

  const l = Math.cbrt(
    0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue,
  );
  const m = Math.cbrt(
    0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue,
  );
  const s = Math.cbrt(
    0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue,
  );

  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const green_red = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const blue_yellow = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const chroma = Math.hypot(green_red, blue_yellow);
  const hue =
    chroma < 1e-6
      ? 0
      : ((Math.atan2(blue_yellow, green_red) * 180) / Math.PI + 360) % 360;

  return { l: lightness, c: chroma, h: hue, a };
}

/** Unclamped sRGB channels (0–1 when in gamut, outside it when not). */
function oklchToChannels({ l, c, h }: Oklch): [number, number, number] {
  const radians = (h * Math.PI) / 180;
  const green_red = c * Math.cos(radians);
  const blue_yellow = c * Math.sin(radians);

  const long = (l + 0.3963377774 * green_red + 0.2158037573 * blue_yellow) ** 3;
  const medium = (l - 0.1055613458 * green_red - 0.0638541728 * blue_yellow) ** 3;
  const short = (l - 0.0894841775 * green_red - 1.291485548 * blue_yellow) ** 3;

  return [
    linearToSrgb(4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short),
    linearToSrgb(-1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short),
    linearToSrgb(-0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short),
  ];
}

/** Whether an OKLCH colour can be shown on an sRGB screen at all. */
export function isInSrgbGamut(colour: Oklch): boolean {
  const epsilon = 1e-4;
  return oklchToChannels(colour).every(
    (channel) => channel >= -epsilon && channel <= 1 + epsilon,
  );
}

/**
 * Pull a colour back into sRGB by lowering its chroma until it fits, keeping
 * its lightness and hue. Clamping the RGB channels instead, the naive fix,
 * silently changes the hue: a vivid rotated blue can come back visibly green.
 */
export function gamutMapOklch(colour: Oklch): Oklch {
  if (isInSrgbGamut(colour)) return colour;

  let fits = 0;
  let tooMuch = colour.c;
  // ~20 halvings resolves chroma far finer than 8-bit output can show.
  for (let step = 0; step < 20; step++) {
    const middle = (fits + tooMuch) / 2;
    if (isInSrgbGamut({ ...colour, c: middle })) fits = middle;
    else tooMuch = middle;
  }

  return { ...colour, c: fits };
}

export function oklchToRgb(colour: Oklch): Rgb {
  const [red, green, blue] = oklchToChannels(colour);
  const channel = (value: number) => clamp(Math.round(value * 255), 0, 255);

  return {
    r: channel(red),
    g: channel(green),
    b: channel(blue),
    a: colour.a,
  };
}

/** Convert to sRGB, reducing chroma first if the colour will not fit. */
export function oklchToRgbInGamut(colour: Oklch): Rgb {
  return oklchToRgb(gamutMapOklch(colour));
}

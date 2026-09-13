/**
 * Reading and writing colours as text.
 *
 * Parsing returns `undefined` rather than throwing, because these functions
 * run on every keystroke of a colour field: a half-typed `#ff` is not an
 * error, it is simply not a colour yet.
 */

import {
  hslToRgb,
  oklchToRgb,
  rgbToHsl,
  rgbToOklch,
  type Rgb,
} from "@/lib/colour";
import { clamp } from "@/lib/utils";

/** Round to a fixed number of decimals, to keep the output tidy. */
function round(value: number, places = 0): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

const HEX_PATTERN = /^#?([0-9a-f]{3,8})$/i;
const FUNC_PATTERN = /^(rgba?|hsla?|oklch)\(([^)]*)\)$/i;

/** Split a CSS function's arguments on commas or spaces, dropping any slash. */
function args(body: string): string[] {
  return body
    .replace(/\//g, " ")
    .split(/[\s,]+/)
    .filter(Boolean);
}

/** Read a number that may be written as a percentage of `full`. */
function scalar(token: string | undefined, full: number): number {
  if (!token) return 0;
  const value = Number.parseFloat(token);
  if (Number.isNaN(value)) return 0;
  return token.endsWith("%") ? (value / 100) * full : value;
}

function alphaFrom(token: string | undefined): number {
  if (token === undefined) return 1;
  const value = Number.parseFloat(token);
  if (Number.isNaN(value)) return 1;
  return clamp(token.endsWith("%") ? value / 100 : value, 0, 1);
}

/**
 * Parse a hex, `rgb()`, `hsl()` or `oklch()` string. Returns `undefined`
 * rather than throwing, so a half-typed field simply shows nothing yet.
 */
export function parseColour(input: string): Rgb | undefined {
  const text = input.trim();
  if (text === "") return undefined;

  const hex = HEX_PATTERN.exec(text);
  if (hex) return fromHex(hex[1]);

  const func = FUNC_PATTERN.exec(text);
  if (!func) return undefined;

  const [name, body] = [func[1].toLowerCase(), func[2]];
  const parts = args(body);

  if (name === "rgb" || name === "rgba") {
    return {
      r: clamp(Math.round(scalar(parts[0], 255)), 0, 255),
      g: clamp(Math.round(scalar(parts[1], 255)), 0, 255),
      b: clamp(Math.round(scalar(parts[2], 255)), 0, 255),
      a: alphaFrom(parts[3]),
    };
  }

  if (name === "hsl" || name === "hsla") {
    return hslToRgb({
      h: Number.parseFloat(parts[0]) || 0,
      s: clamp(scalar(parts[1], 100), 0, 100),
      l: clamp(scalar(parts[2], 100), 0, 100),
      a: alphaFrom(parts[3]),
    });
  }

  return oklchToRgb({
    l: clamp(scalar(parts[0], 1), 0, 1),
    c: clamp(scalar(parts[1], 0.4), 0, 1),
    h: Number.parseFloat(parts[2]) || 0,
    a: alphaFrom(parts[3]),
  });
}

/** Expand a bare hex body (3, 4, 6 or 8 digits) into channels. */
function fromHex(body: string): Rgb | undefined {
  const digits =
    body.length === 3 || body.length === 4
      ? [...body].map((digit) => digit + digit).join("")
      : body;

  if (digits.length !== 6 && digits.length !== 8) return undefined;

  const value = (start: number) => Number.parseInt(digits.slice(start, start + 2), 16);
  return {
    r: value(0),
    g: value(2),
    b: value(4),
    a: digits.length === 8 ? round(value(6) / 255, 3) : 1,
  };
}

export function formatHex({ r, g, b, a }: Rgb): string {
  const pair = (value: number) =>
    clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
  const alpha = a >= 1 ? "" : pair(a * 255);
  return `#${pair(r)}${pair(g)}${pair(b)}${alpha}`;
}

export function formatRgb({ r, g, b, a }: Rgb): string {
  const channels = `${Math.round(r)} ${Math.round(g)} ${Math.round(b)}`;
  return a >= 1 ? `rgb(${channels})` : `rgb(${channels} / ${round(a, 3)})`;
}

export function formatHsl(colour: Rgb): string {
  const { h, s, l, a } = rgbToHsl(colour);
  const body = `${round(h)} ${round(s, 1)}% ${round(l, 1)}%`;
  return a >= 1 ? `hsl(${body})` : `hsl(${body} / ${round(a, 3)})`;
}

export function formatOklch(colour: Rgb): string {
  const { l, c, h, a } = rgbToOklch(colour);
  const body = `${round(l * 100, 2)}% ${round(c, 4)} ${round(h, 2)}`;
  return a >= 1 ? `oklch(${body})` : `oklch(${body} / ${round(a, 3)})`;
}

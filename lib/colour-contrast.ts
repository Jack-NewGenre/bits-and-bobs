/**
 * WCAG contrast maths.
 *
 * Contrast is measured between the *relative luminance* of two colours: how
 * much light each one actually emits, not how light it looks. That is why a
 * saturated yellow and a saturated blue at the same HSL lightness can be
 * wildly far apart: green carries most of the luminance, blue almost none.
 */

import { srgbToLinear, type Rgb } from "@/lib/colour";

export type ContrastLevel = "AAA" | "AA" | "AA Large" | "Fail";

export interface ContrastReport {
  /** 1–21. */
  ratio: number;
  /** Passes for body text at normal size. */
  normalAa: boolean;
  normalAaa: boolean;
  /** Passes for 18pt+, or 14pt+ bold. */
  largeAa: boolean;
  largeAaa: boolean;
  /** Passes for icons, borders and other non-text visuals. */
  uiAa: boolean;
  /** The best grade this pair earns for body text. */
  level: ContrastLevel;
}

/** WCAG relative luminance: linear light, weighted by the eye's sensitivity. */
export function relativeLuminance({ r, g, b }: Rgb): number {
  return (
    0.2126 * srgbToLinear(r / 255) +
    0.7152 * srgbToLinear(g / 255) +
    0.0722 * srgbToLinear(b / 255)
  );
}

/** Contrast ratio between two colours, from 1 (identical) to 21 (max). */
export function contrastRatio(foreground: Rgb, background: Rgb): number {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Flatten a translucent foreground onto its background before measuring. */
export function flatten(foreground: Rgb, background: Rgb): Rgb {
  if (foreground.a >= 1) return foreground;
  const mix = (front: number, back: number) =>
    Math.round(front * foreground.a + back * (1 - foreground.a));
  return {
    r: mix(foreground.r, background.r),
    g: mix(foreground.g, background.g),
    b: mix(foreground.b, background.b),
    a: 1,
  };
}

export function gradeContrast(
  foreground: Rgb,
  background: Rgb,
): ContrastReport {
  const ratio = contrastRatio(flatten(foreground, background), background);

  const normalAa = ratio >= 4.5;
  const normalAaa = ratio >= 7;
  const largeAa = ratio >= 3;
  const largeAaa = ratio >= 4.5;

  return {
    ratio,
    normalAa,
    normalAaa,
    largeAa,
    largeAaa,
    uiAa: ratio >= 3,
    level: normalAaa ? "AAA" : normalAa ? "AA" : largeAa ? "AA Large" : "Fail",
  };
}

/**
 * Whether black or white text reads better on this colour. Compared by ratio
 * rather than a luminance threshold, so the answer is the one WCAG agrees
 * with.
 */
export function bestTextOn(background: Rgb): Rgb {
  const black = { r: 0, g: 0, b: 0, a: 1 };
  const white = { r: 255, g: 255, b: 255, a: 1 };
  return contrastRatio(black, background) >= contrastRatio(white, background)
    ? black
    : white;
}

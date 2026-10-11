/**
 * Gradients: CSS text, colour sampling and PNG rendering.
 *
 * Colours are blended in OKLab rather than sRGB. A straight sRGB blend from
 * blue to yellow passes through a dead grey middle; OKLab keeps the midpoint
 * as bright and as saturated as the ends. The CSS asks the browser for the
 * same thing with `in oklab`, and the PNG export bakes enough OKLab samples
 * into the canvas gradient that its own sRGB blending cannot show.
 */

import { oklabToRgb, rgbToOklab, type Rgb } from "@/lib/colour/colour";
import { formatHex } from "@/lib/colour/colour-format";
import { randomBaseColour } from "@/lib/colour/colour-harmony";
import { createCanvas2D, type AnyCanvas } from "@/lib/image/canvas";

export type GradientKind = "linear" | "radial" | "conic";

export interface GradientStop {
  colour: Rgb;
  /** Percent along the gradient, 0–100. */
  position: number;
}

export interface Gradient {
  kind: GradientKind;
  /** Degrees. Direction for linear, starting angle for conic, unused for radial. */
  angle: number;
  stops: GradientStop[];
}

export const MAX_STOPS = 8;

/** How many OKLab samples a PNG gets, enough that no sRGB banding shows. */
const BAKED_SAMPLES = 64;

const byPosition = (a: GradientStop, b: GradientStop) =>
  a.position - b.position;

function stopList(stops: GradientStop[]): string {
  return [...stops]
    .sort(byPosition)
    .map(
      ({ colour, position }) => `${formatHex(colour)} ${Math.round(position)}%`,
    )
    .join(", ");
}

/** The gradient as a CSS `background-image` value. */
export function toCssGradient({ kind, angle, stops }: Gradient): string {
  const list = stopList(stops);
  if (kind === "radial") return `radial-gradient(circle in oklab, ${list})`;
  if (kind === "conic")
    return `conic-gradient(from ${angle}deg in oklab, ${list})`;
  return `linear-gradient(${angle}deg in oklab, ${list})`;
}

/** The colour at a position (0–100), blended in OKLab between its two stops. */
export function sampleGradient(stops: GradientStop[], position: number): Rgb {
  const sorted = [...stops].sort(byPosition);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (position <= first.position) return first.colour;
  if (position >= last.position) return last.colour;

  const upper = sorted.findIndex((stop) => stop.position >= position);
  const [from, to] = [sorted[upper - 1], sorted[upper]];
  const span = to.position - from.position;
  const t = span === 0 ? 1 : (position - from.position) / span;

  const start = rgbToOklab(from.colour);
  const end = rgbToOklab(to.colour);
  const mix = (index: number) => start[index] + (end[index] - start[index]) * t;
  return oklabToRgb(
    [mix(0), mix(1), mix(2)],
    from.colour.a + (to.colour.a - from.colour.a) * t,
  );
}

/** A new stop halfway into the widest gap, coloured to sit there invisibly. */
export function addStop(stops: GradientStop[]): GradientStop[] {
  const sorted = [...stops].sort(byPosition);
  const [gapStart, gapEnd] = sorted.slice(1).reduce<[number, number]>(
    (widest, stop, index) => {
      const previous = sorted[index].position;
      return stop.position - previous > widest[1] - widest[0]
        ? [previous, stop.position]
        : widest;
    },
    [sorted[0].position, sorted[0].position],
  );

  const position = Math.round((gapStart + gapEnd) / 2);
  return [...stops, { colour: sampleGradient(stops, position), position }];
}

/** A random two or three stop gradient from neighbouring, well-lit hues. */
export function randomGradient(
  kind: GradientKind,
  random: () => number = Math.random,
): Gradient {
  const count = random() < 0.5 ? 2 : 3;
  const stops = Array.from({ length: count }, (_, index) => ({
    colour: randomBaseColour(random),
    position: Math.round((index / (count - 1)) * 100),
  }));
  return { kind, angle: Math.round(random() * 8) * 45, stops };
}

/** Draw the gradient onto a fresh canvas, ready to export. */
export function renderGradient(
  gradient: Gradient,
  width: number,
  height: number,
): AnyCanvas {
  const { canvas, ctx } = createCanvas2D(width, height);
  const [cx, cy] = [width / 2, height / 2];
  const radians = (gradient.angle * Math.PI) / 180;

  let fill: CanvasGradient;
  if (gradient.kind === "radial") {
    fill = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(cx, cy));
  } else if (gradient.kind === "conic") {
    // CSS measures from the top, clockwise; canvas measures from the right.
    fill = ctx.createConicGradient(radians - Math.PI / 2, cx, cy);
  } else {
    // CSS sizes the line so the corners land exactly on 0% and 100%.
    const half =
      (Math.abs(width * Math.sin(radians)) +
        Math.abs(height * Math.cos(radians))) /
      2;
    const [dx, dy] = [Math.sin(radians) * half, -Math.cos(radians) * half];
    fill = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
  }

  for (let index = 0; index <= BAKED_SAMPLES; index++) {
    const offset = index / BAKED_SAMPLES;
    const colour = sampleGradient(gradient.stops, offset * 100);
    fill.addColorStop(offset, formatHex(colour));
  }

  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, width, height);
  return canvas;
}

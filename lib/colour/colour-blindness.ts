/**
 * Colour vision deficiency simulation.
 *
 * Roughly one man in twelve sees a narrower colour range than the palette you
 * designed in. Each deficiency is a missing or shifted cone in the eye, which
 * collapses part of the spectrum: red and green slide together for the common
 * ones, blue and yellow for the rare one.
 *
 * Each simulation is a 3x3 matrix applied to the pixel's *linear* light, not
 * its sRGB values. Applying it to sRGB directly, as many quick versions do,
 * exaggerates the effect in the shadows, because sRGB is not proportional to
 * the light actually reaching the eye.
 */

import {
  canvasToBlob,
  createCanvas2D,
  nextTick,
  throwIfAborted,
} from "@/lib/image/canvas";
import { linearToSrgb, srgbToLinear, type Rgb } from "@/lib/colour/colour";
import { clamp } from "@/lib/utils";
import { withSuffix } from "@/lib/download";

export type VisionType =
  | "normal"
  | "protanopia"
  | "deuteranopia"
  | "tritanopia"
  | "achromatopsia";

/** Row-major 3x3, applied to linear RGB. */
export type ColourMatrix = readonly [
  number, number, number,
  number, number, number,
  number, number, number,
];

export interface VisionMode {
  id: VisionType;
  label: string;
  /** Rough share of the population, for context in the UI. */
  prevalence: string;
  description: string;
  matrix: ColourMatrix;
}

const IDENTITY: ColourMatrix = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export const VISION_MODES: VisionMode[] = [
  {
    id: "normal",
    label: "Normal",
    prevalence: "-",
    description: "Unmodified, for comparison.",
    matrix: IDENTITY,
  },
  {
    id: "deuteranopia",
    label: "Deuteranopia",
    prevalence: "~6% of men",
    description: "No green cone. The most common form; reds and greens merge.",
    matrix: [0.625, 0.375, 0, 0.7, 0.3, 0, 0, 0.3, 0.7],
  },
  {
    id: "protanopia",
    label: "Protanopia",
    prevalence: "~2% of men",
    description: "No red cone. Reds darken sharply and drift towards green.",
    matrix: [0.567, 0.433, 0, 0.558, 0.442, 0, 0, 0.242, 0.758],
  },
  {
    id: "tritanopia",
    label: "Tritanopia",
    prevalence: "~0.01%",
    description: "No blue cone. Blues turn green and yellows turn pink.",
    matrix: [0.95, 0.05, 0, 0, 0.433, 0.567, 0, 0.475, 0.525],
  },
  {
    id: "achromatopsia",
    label: "Achromatopsia",
    prevalence: "~0.003%",
    description: "No colour at all, only lightness remains.",
    matrix: [0.299, 0.587, 0.114, 0.299, 0.587, 0.114, 0.299, 0.587, 0.114],
  },
];

export function visionMode(id: VisionType): VisionMode {
  return VISION_MODES.find((mode) => mode.id === id) ?? VISION_MODES[0];
}

/** Apply a simulation to one colour. */
export function simulateColour(colour: Rgb, matrix: ColourMatrix): Rgb {
  const red = srgbToLinear(colour.r / 255);
  const green = srgbToLinear(colour.g / 255);
  const blue = srgbToLinear(colour.b / 255);

  const channel = (offset: number) =>
    clamp(
      Math.round(
        linearToSrgb(
          clamp(
            matrix[offset] * red +
              matrix[offset + 1] * green +
              matrix[offset + 2] * blue,
            0,
            1,
          ),
        ) * 255,
      ),
      0,
      255,
    );

  return { r: channel(0), g: channel(3), b: channel(6), a: colour.a };
}

/**
 * Apply a simulation to a whole RGBA buffer, in place. Alpha is untouched.
 * A 256-entry lookup table does the sRGB decode once per possible value
 * rather than three times per pixel.
 */
export function simulatePixels(
  data: Uint8ClampedArray,
  matrix: ColourMatrix,
): Uint8ClampedArray {
  const toLinear = new Float32Array(256);
  for (let value = 0; value < 256; value++) {
    toLinear[value] = srgbToLinear(value / 255);
  }

  for (let index = 0; index < data.length; index += 4) {
    const red = toLinear[data[index]];
    const green = toLinear[data[index + 1]];
    const blue = toLinear[data[index + 2]];

    for (let channel = 0; channel < 3; channel++) {
      const row = channel * 3;
      const value =
        matrix[row] * red + matrix[row + 1] * green + matrix[row + 2] * blue;
      data[index + channel] = linearToSrgb(clamp(value, 0, 1)) * 255;
    }
  }

  return data;
}

export interface SimulateResult {
  blob: Blob;
  width: number;
  height: number;
}

export interface SimulateOptions {
  signal?: AbortSignal;
}

/**
 * Render an image as someone with the chosen vision type would see it.
 * Throws `DOMException` (name "AbortError") if aborted.
 */
export async function simulateImage(
  source: Blob,
  vision: VisionType,
  { signal }: SimulateOptions = {},
): Promise<SimulateResult> {
  throwIfAborted(signal);

  const bitmap = await createImageBitmap(source);
  throwIfAborted(signal);

  const { width, height } = bitmap;
  const { canvas, ctx } = createCanvas2D(width, height);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();

  if (vision !== "normal") {
    await nextTick();
    throwIfAborted(signal);

    const image = ctx.getImageData(0, 0, width, height);
    simulatePixels(image.data, visionMode(vision).matrix);
    ctx.putImageData(image, 0, 0);
  }

  return { blob: await canvasToBlob(canvas, "image/png"), width, height };
}

/** Filename for a simulated image, tagged with the vision type it shows. */
export function simulatedName(name: string, vision: VisionType): string {
  return withSuffix(name, `-${vision}`, "png");
}

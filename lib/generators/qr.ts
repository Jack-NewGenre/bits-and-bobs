/**
 * QR code generation and styling.
 *
 * The encoding, turning text into the grid of dark and light squares, comes
 * from `@paulmillr/qr`, which hands back the raw matrix. Everything visual is
 * done here, because a QR code is only useful if a phone can read it, and the
 * decisions that decide whether it can are all in the rendering:
 *
 *   - The quiet zone. A QR code needs empty space around it, or a scanner
 *     cannot tell where the code ends.
 *   - Contrast. Dark-on-light is what scanners expect; inverting it defeats
 *     many of them.
 *   - The three corner finder patterns. Rounding the data dots is fine, but
 *     those corners are how a scanner locates the code at all, so they stay
 *     solid whatever shape the rest takes.
 */

import { canvasToBlob, createCanvas2D } from "@/lib/image/canvas";
import { contrastRatio, relativeLuminance } from "@/lib/colour/colour-contrast";
import { parseColour } from "@/lib/colour/colour-format";
import { clamp } from "@/lib/utils";

export type ErrorCorrection = "low" | "medium" | "quartile" | "high";

export const ERROR_LEVELS: {
  value: ErrorCorrection;
  label: string;
  recovers: string;
}[] = [
  { value: "low", label: "Low", recovers: "7% recoverable" },
  { value: "medium", label: "Medium", recovers: "15% recoverable" },
  { value: "quartile", label: "Quartile", recovers: "25% recoverable" },
  { value: "high", label: "High", recovers: "30% recoverable" },
];

export type ModuleShape = "square" | "rounded" | "dot";

export const MODULE_SHAPES: { value: ModuleShape; label: string }[] = [
  { value: "square", label: "Square" },
  { value: "rounded", label: "Rounded" },
  { value: "dot", label: "Dots" },
];

export interface QrSettings {
  ecc: ErrorCorrection;
  shape: ModuleShape;
  foreground: string;
  background: string;
  /** Quiet-zone width, in modules. Four is the specified minimum. */
  margin: number;
  /** Longest edge of the exported PNG, in pixels. */
  size: number;
}

export const DEFAULT_QR_SETTINGS: QrSettings = {
  ecc: "medium",
  shape: "square",
  foreground: "#000000",
  background: "#ffffff",
  margin: 4,
  size: 512,
};

export const MIN_MARGIN = 0;
export const MAX_MARGIN = 8;
/** Below this, scanners struggle to find the edges of the code. */
export const SAFE_MARGIN = 4;
/** Contrast below this is unreliable for the cameras in most phones. */
export const MIN_CONTRAST = 7;

export type Matrix = boolean[][];

let encoderPromise: Promise<typeof import("@paulmillr/qr").default> | undefined;

/** Load the encoder once, on first use, and reuse it thereafter. */
function loadEncoder() {
  return (encoderPromise ??= import("@paulmillr/qr").then(
    (module) => module.default,
  ));
}

/**
 * Encode text into the grid of dark and light modules.
 * Throws if the text is too long for even the largest QR version.
 */
export async function buildMatrix(
  text: string,
  ecc: ErrorCorrection,
): Promise<Matrix> {
  const encodeQR = await loadEncoder();
  // The quiet zone is added at render time, so the matrix itself has none.
  return encodeQR(text, "raw", { ecc, border: 0 });
}

/**
 * Whether a module belongs to one of the three corner finder patterns, the
 * 7x7 squares a scanner uses to locate and orient the code. Real QR codes
 * start at 21x21, so the three regions never overlap.
 */
export function isFinder(row: number, column: number, size: number): boolean {
  const inCorner = (r: number, c: number) => r < 7 && c < 7;
  return (
    inCorner(row, column) ||
    inCorner(row, size - 1 - column) ||
    inCorner(size - 1 - row, column)
  );
}

/** SVG path data for every dark module, in the chosen shape. */
export function modulesToPath(matrix: Matrix, shape: ModuleShape): string {
  const size = matrix.length;
  const parts: string[] = [];

  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      if (!matrix[row][column]) continue;

      // The finder patterns stay solid whatever the data modules do, so the
      // code keeps the shape scanners are looking for.
      const solid = shape === "square" || isFinder(row, column, size);

      if (solid) {
        parts.push(`M${column} ${row}h1v1h-1z`);
      } else if (shape === "dot") {
        parts.push(
          `M${column + 0.5} ${row + 0.08}a0.42 0.42 0 1 0 0.001 0z`,
        );
      } else {
        parts.push(
          `M${column + 0.22} ${row}h0.56a0.22 0.22 0 0 1 0.22 0.22v0.56a0.22 0.22 0 0 1-0.22 0.22h-0.56a0.22 0.22 0 0 1-0.22-0.22v-0.56a0.22 0.22 0 0 1 0.22-0.22z`,
        );
      }
    }
  }

  return parts.join("");
}

/** Render a matrix as a standalone SVG document. */
export function matrixToSvg(matrix: Matrix, settings: QrSettings): string {
  const size = matrix.length;
  const margin = clamp(settings.margin, MIN_MARGIN, MAX_MARGIN);
  const extent = size + margin * 2;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${extent} ${extent}" ` +
    `width="${settings.size}" height="${settings.size}" shape-rendering="crispEdges">` +
    `<rect width="${extent}" height="${extent}" fill="${settings.background}"/>` +
    `<g transform="translate(${margin} ${margin})" fill="${settings.foreground}">` +
    `<path d="${modulesToPath(matrix, settings.shape)}"/>` +
    `</g></svg>`
  );
}

export interface QrWarning {
  kind: "contrast" | "margin" | "inverted";
  message: string;
}

/** Reasons a phone might fail to read the code as configured. */
export function checkScannability(settings: QrSettings): QrWarning[] {
  const warnings: QrWarning[] = [];

  const foreground = parseColour(settings.foreground);
  const background = parseColour(settings.background);

  if (foreground && background) {
    const ratio = contrastRatio(foreground, background);
    if (ratio < MIN_CONTRAST) {
      warnings.push({
        kind: "contrast",
        message: `Only ${ratio.toFixed(1)}:1 contrast between the two colours. Phone cameras need a stark difference, so aim for ${MIN_CONTRAST}:1 or more.`,
      });
    }

    // Light modules on a dark background is not merely harder to read: a
    // decoder cannot locate the finder patterns at all, so the code fails
    // outright rather than degrading.
    if (relativeLuminance(foreground) > relativeLuminance(background)) {
      warnings.push({
        kind: "inverted",
        message:
          "The modules are lighter than the background. QR codes must be dark on light. Inverted, scanners cannot find the code at all.",
      });
    }
  }

  if (settings.margin < SAFE_MARGIN) {
    warnings.push({
      kind: "margin",
      message:
        "The quiet zone is below the specified four modules. Without that empty border, scanners cannot tell where the code ends.",
    });
  }

  return warnings;
}

/** Render the SVG to a PNG at the requested pixel size. */
export async function svgToPng(svg: string, size: number): Promise<Blob> {
  const source = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(source);

  try {
    const bitmap = await createImageBitmap(source).catch(async () => {
      // Safari cannot decode an SVG blob directly; an <img> can.
      const image = new Image();
      image.src = url;
      await image.decode();
      return image as unknown as ImageBitmap;
    });

    const { canvas, ctx } = createCanvas2D(size, size);
    ctx.drawImage(bitmap, 0, 0, size, size);
    return await canvasToBlob(canvas, "image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

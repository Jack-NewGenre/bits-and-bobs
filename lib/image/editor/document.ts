/** The editable document: its size, its background and the starting presets. */

export interface EditorDocument {
  width: number;
  height: number;
  /** A CSS colour, or `null` for a transparent background. */
  background: string | null;
}

export interface DocumentPreset {
  label: string;
  width: number;
  height: number;
}

/** What the editor opens on: a blank, white HD canvas. */
export const DEFAULT_DOCUMENT: EditorDocument = {
  width: 1920,
  height: 1080,
  background: "#ffffff",
};

export const DOCUMENT_PRESETS: readonly DocumentPreset[] = [
  { label: "Square", width: 1080, height: 1080 },
  { label: "HD", width: 1920, height: 1080 },
  { label: "Social card", width: 1200, height: 630 },
  { label: "Story", width: 1080, height: 1920 },
];

export const MIN_DIMENSION = 1;
/** Matches the WebGL filter texture limit, so adjustments never tile. */
export const MAX_DIMENSION = 4096;

export function clampDimension(value: number): number {
  if (!Number.isFinite(value)) return MIN_DIMENSION;
  return Math.min(MAX_DIMENSION, Math.max(MIN_DIMENSION, Math.round(value)));
}

/**
 * Shrinks a size to fit within `max` on its long edge, keeping the aspect
 * ratio. Anything already small enough is returned untouched.
 */
export function fitWithin(
  width: number,
  height: number,
  max = MAX_DIMENSION,
): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** The scale that makes a layer fit inside the document, never enlarging it. */
export function scaleToFit(
  layerWidth: number,
  layerHeight: number,
  doc: Pick<EditorDocument, "width" | "height">,
): number {
  return Math.min(1, doc.width / layerWidth, doc.height / layerHeight);
}

export interface Bounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The smallest box holding every rectangle given, or `null` for none. */
export function unionBounds(rects: readonly Bounds[]): Bounds | null {
  if (rects.length === 0) return null;
  const left = Math.min(...rects.map((r) => r.left));
  const top = Math.min(...rects.map((r) => r.top));
  const right = Math.max(...rects.map((r) => r.left + r.width));
  const bottom = Math.max(...rects.map((r) => r.top + r.height));
  return { left, top, width: right - left, height: bottom - top };
}

/** The overlap of two rectangles, or `null` when they do not meet. */
export function intersectBounds(a: Bounds, b: Bounds): Bounds | null {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.left + a.width, b.left + b.width);
  const bottom = Math.min(a.top + a.height, b.top + b.height);
  return right > left && bottom > top
    ? { left, top, width: right - left, height: bottom - top }
    : null;
}

/** Zoom maths for the editor's viewport. */

export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 32;
const ZOOM_STEP = 1.25;

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** Space along each edge of the view that is covered, e.g. by floating panels. */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

/** The view left once covered edges are taken away, as a box. */
export function visibleArea(
  viewWidth: number,
  viewHeight: number,
  insets: Insets = NO_INSETS,
) {
  return {
    left: insets.left,
    top: insets.top,
    width: Math.max(1, viewWidth - insets.left - insets.right),
    height: Math.max(1, viewHeight - insets.top - insets.bottom),
  };
}

/** The zoom at which the whole document fits the view with some breathing room. */
export function fitZoom(
  docWidth: number,
  docHeight: number,
  viewWidth: number,
  viewHeight: number,
  padding = 32,
): number {
  const width = Math.max(1, viewWidth - padding * 2);
  const height = Math.max(1, viewHeight - padding * 2);
  return clampZoom(Math.min(width / docWidth, height / docHeight));
}

/** One step in or out, the same ratio each way so in then out lands back. */
export function stepZoom(zoom: number, direction: 1 | -1): number {
  return clampZoom(direction === 1 ? zoom * ZOOM_STEP : zoom / ZOOM_STEP);
}

/**
 * The pan that centres a document of the given size at the given zoom in the
 * uncovered part of the view, returned as a Fabric viewport transform.
 */
export function centredTransform(
  zoom: number,
  docWidth: number,
  docHeight: number,
  viewWidth: number,
  viewHeight: number,
  insets: Insets = NO_INSETS,
): [number, number, number, number, number, number] {
  const area = visibleArea(viewWidth, viewHeight, insets);
  return [
    zoom,
    0,
    0,
    zoom,
    area.left + (area.width - docWidth * zoom) / 2,
    area.top + (area.height - docHeight * zoom) / 2,
  ];
}

export function formatZoom(zoom: number): string {
  return `${Math.round(zoom * 100)}%`;
}

/**
 * The ruler's labelled interval in document pixels: the smallest 1, 2 or 5
 * times a power of ten that leaves at least `minGap` screen pixels between
 * labels, so the numbers never crowd at any zoom.
 */
export function rulerStep(zoom: number, minGap = 64): number {
  const target = minGap / zoom;
  const power = 10 ** Math.floor(Math.log10(target));
  const factor = [1, 2, 5, 10].find((f) => f * power >= target) ?? 10;
  return factor * power;
}

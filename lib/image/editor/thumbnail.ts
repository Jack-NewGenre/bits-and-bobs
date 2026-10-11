/** Small previews of each layer for the layers panel. */

import type { FabricObject } from "fabric";

/** Thumbnails are drawn at twice their on-screen size so they stay sharp. */
export const THUMBNAIL_SIZE = 64;

/** The scale that fits a box of the given size into a square thumbnail. */
export function thumbnailScale(
  width: number,
  height: number,
  size = THUMBNAIL_SIZE,
): number {
  return size / Math.max(width, height, 1);
}

/**
 * Draws a layer, with its transform and adjustments, fitted to the thumbnail.
 * A hidden layer draws nothing, so it returns `null` and the caller keeps the
 * preview it already had, the way Photoshop does.
 */
export function renderThumbnail(
  object: FabricObject,
  size = THUMBNAIL_SIZE,
): string | null {
  if (!object.visible) return null;
  const bounds = object.getBoundingRect();
  if (bounds.width <= 0 || bounds.height <= 0) return null;
  const multiplier = thumbnailScale(bounds.width, bounds.height, size);
  return object
    .toCanvasElement({ multiplier, withoutShadow: true })
    .toDataURL("image/png");
}

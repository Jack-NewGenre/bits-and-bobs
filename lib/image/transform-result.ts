/**
 * The small decisions the convert / compress / resize result panel makes about
 * its output: what to call the file, how much it shrank, and whether to offer
 * a better format.
 */

import { extensionForType, withSuffix } from "@/lib/download";
import { resolveFormat } from "@/lib/image/image-output";
import type { TransformSettings } from "@/lib/image/transform";

/** Filename for a transformed blob, following the format it encoded to. */
export function transformedName(
  name: string,
  blob: Blob,
  suffix: string,
): string {
  return withSuffix(name, suffix, extensionForType(blob.type));
}

/**
 * Whether to offer WebP as a way out. The browser's PNG encoder is weaker
 * than whatever wrote the original, so re-encoding a PNG usually inflates it;
 * rather than just reporting that, the panel offers the format that wins.
 */
export function shouldSuggestWebp(
  saving: number,
  format: TransformSettings["format"],
  sourceType?: string,
): boolean {
  return saving < 0 && resolveFormat(format, sourceType) !== "image/webp";
}

/** Whole-percent change in file size. Negative means it grew. */
export function percentSmaller(before: number, after: number): number {
  if (before <= 0) return 0;
  return Math.round((1 - after / before) * 100);
}

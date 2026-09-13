/**
 * Choosing how a processed image is encoded.
 *
 * Shared by every tool that writes an image back out, so "keep the source
 * format", the quality range and the JPEG matte all behave identically
 * whichever tool the user happens to be in.
 */

import { clamp } from "@/lib/utils";

/** `source` keeps whatever the file already was. */
export type OutputFormat = "source" | "image/png" | "image/jpeg" | "image/webp";

export const OUTPUT_FORMATS: { value: OutputFormat; label: string }[] = [
  { value: "source", label: "Same" },
  { value: "image/png", label: "PNG" },
  { value: "image/jpeg", label: "JPG" },
  { value: "image/webp", label: "WebP" },
];

/** Formats where the quality setting actually does something. */
export function isLossy(format: OutputFormat, sourceType?: string): boolean {
  const resolved = resolveFormat(format, sourceType);
  return resolved === "image/jpeg" || resolved === "image/webp";
}

/** What `source` actually means for a given file. PNG is the safe default. */
export function resolveFormat(
  format: OutputFormat,
  sourceType?: string,
): string {
  if (format !== "source") return format;
  return sourceType === "image/jpeg" || sourceType === "image/webp"
    ? sourceType
    : "image/png";
}

/** Formats with no alpha channel, which therefore need a matte behind them. */
export function needsMatte(
  format: OutputFormat,
  sourceType?: string,
): boolean {
  return resolveFormat(format, sourceType) === "image/jpeg";
}

/**
 * Choose an output encoding. `source` keeps whatever the file already was,
 * which is the least surprising default; anything else is an explicit choice
 * and is honoured as given. PNG is lossless, so it ignores the quality.
 */
export function outputTypeFor(
  inputType?: string,
  format: OutputFormat = "source",
  quality = 92,
): { type: string; quality?: number } {
  const type = resolveFormat(format, inputType);
  return type === "image/png"
    ? { type }
    : { type, quality: clamp(quality, 1, 100) / 100 };
}

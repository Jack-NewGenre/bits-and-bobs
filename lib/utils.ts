import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Constrain a number to the inclusive [min, max] range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Format a byte count as a human-readable string, e.g. `1.2 MB`. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ["KB", "MB", "GB"]
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

/** Shallow-compare two flat objects of primitives. */
export function shallowEqual<T extends object>(a: T, b: T): boolean {
  if (a === b) return true
  const keys = Object.keys(a) as (keyof T)[]
  if (keys.length !== Object.keys(b).length) return false
  return keys.every((key) => a[key] === b[key])
}

/**
 * Whole-percent change in size. Negative means it grew, unless `clampToZero`
 * is set, which is what a tool wants when "it got bigger" is not a meaningful
 * thing to show.
 */
export function percentSmaller(
  before: number,
  after: number,
  { clampToZero = false }: { clampToZero?: boolean } = {},
): number {
  if (before <= 0) return 0;
  const percent = Math.round((1 - after / before) * 100);
  return clampToZero ? Math.max(0, percent) : percent;
}

/**
 * Whether a thrown value is an abort rather than a real failure.
 *
 * Aborts arrive as a `DOMException`, which inherits from `Error` in a browser
 * but not in every environment the tests run in, so the name is read off the
 * value directly rather than through an `instanceof` that can quietly fail.
 */
export function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

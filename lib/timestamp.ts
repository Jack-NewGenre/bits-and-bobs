/**
 * Unix timestamp <-> human date conversion. Pure functions, no DOM.
 */

export type TimestampUnit = "seconds" | "milliseconds";

export interface ParsedTimestamp {
  /** Milliseconds since the Unix epoch. */
  ms: number;
}

/**
 * Parse a numeric Unix timestamp string. Auto-detects seconds vs milliseconds
 * by magnitude when `unit` is "auto"; otherwise honours the given unit.
 * Returns null for anything that is not a finite number.
 */
export function parseTimestamp(
  input: string,
  unit: TimestampUnit | "auto" = "auto",
): ParsedTimestamp | null {
  const trimmed = input.trim();
  if (trimmed === "" || !/^-?\d+(\.\d+)?$/.test(trimmed)) return null;

  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;

  if (unit === "milliseconds") return { ms: value };
  if (unit === "seconds") return { ms: value * 1000 };

  // Auto: treat 13+ digit magnitudes as milliseconds, otherwise seconds.
  const digits = trimmed.replace(/[^\d]/g, "").length;
  const ms = digits >= 13 ? value : value * 1000;
  // Reject values outside the legal JS Date range (±8.64 × 10¹⁵ ms).
  return Math.abs(ms) <= 8_640_000_000_000_000 ? { ms } : null;
}

/** Parse a human date string (anything `Date` accepts) to epoch ms. */
export function parseDate(input: string): ParsedTimestamp | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  const ms = Date.parse(trimmed);
  return Number.isNaN(ms) ? null : { ms };
}

export interface TimestampParts {
  unixSeconds: number;
  unixMillis: number;
  iso: string;
  utc: string;
  local: string;
  relative: string;
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000_000],
  ["month", 2_592_000_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
  ["second", 1000],
];

/** Express the gap between `ms` and `nowMs` as a human phrase. */
export function formatRelative(ms: number, nowMs: number): string {
  const diff = ms - nowMs;
  const abs = Math.abs(diff);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  for (const [unit, size] of RELATIVE_UNITS) {
    if (abs >= size || unit === "second") {
      return formatter.format(Math.round(diff / size), unit);
    }
  }
  return "now";
}

/** Expand an epoch-ms value into the set of representations the UI shows. */
export function describeTimestamp(ms: number, nowMs: number): TimestampParts {
  const date = new Date(ms);
  return {
    unixSeconds: Math.floor(ms / 1000),
    unixMillis: ms,
    iso: date.toISOString(),
    utc: date.toUTCString(),
    local: date.toLocaleString(),
    relative: formatRelative(ms, nowMs),
  };
}

/**
 * UUID generation — runs entirely in the browser via the Web Crypto API.
 * Pure helpers so they can be unit-tested without a DOM.
 */

export type UuidCase = "lower" | "upper";

export interface UuidOptions {
  /** How many UUIDs to generate. */
  count: number;
  /** Letter case of the output. */
  uppercase: boolean;
  /** Strip the dashes from each UUID. */
  hyphens: boolean;
}

export const DEFAULT_UUID_OPTIONS: UuidOptions = {
  count: 1,
  uppercase: false,
  hyphens: true,
};

/** Bounds for the count input, to keep the UI and output sane. */
export const MIN_COUNT = 1;
export const MAX_COUNT = 1000;

/**
 * Generate a single RFC 4122 v4 UUID. Prefers the native `randomUUID`, falling
 * back to `getRandomValues` so it works in any modern browser context.
 */
export function generateUuid(): string {
  const cryptoObj = globalThis.crypto;
  if (typeof cryptoObj?.randomUUID === "function") {
    return cryptoObj.randomUUID();
  }

  const bytes = new Uint8Array(16);
  cryptoObj.getRandomValues(bytes);
  // Set version (4) and variant (10xx) bits per RFC 4122.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

/** Apply formatting options to a single UUID. */
export function formatUuid(uuid: string, options: UuidOptions): string {
  let result = options.hyphens ? uuid : uuid.replace(/-/g, "");
  result = options.uppercase ? result.toUpperCase() : result.toLowerCase();
  return result;
}

/** Generate a formatted batch of UUIDs, one per array entry. */
export function generateUuids(options: UuidOptions): string[] {
  const count = Math.min(MAX_COUNT, Math.max(MIN_COUNT, Math.trunc(options.count)));
  return Array.from({ length: count }, () =>
    formatUuid(generateUuid(), options),
  );
}

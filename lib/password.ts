/**
 * Cryptographically-strong password generation, fully client-side.
 * Pure helpers so the logic is unit-testable without a DOM.
 */

export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  /** Exclude look-alike characters (O/0, l/1/I, etc.). */
  excludeAmbiguous: boolean;
}

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: false,
};

export const MIN_LENGTH = 4;
export const MAX_LENGTH = 128;

const CHARSETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?",
} as const;

const AMBIGUOUS = new Set("O0oIl1|`'\"{}[]()/\\".split(""));

/** Build the character pool implied by the selected options. */
export function buildPool(options: PasswordOptions): string {
  let pool = "";
  if (options.uppercase) pool += CHARSETS.uppercase;
  if (options.lowercase) pool += CHARSETS.lowercase;
  if (options.numbers) pool += CHARSETS.numbers;
  if (options.symbols) pool += CHARSETS.symbols;
  if (options.excludeAmbiguous) {
    pool = Array.from(pool)
      .filter((char) => !AMBIGUOUS.has(char))
      .join("");
  }
  return pool;
}

/** Unbiased random index in [0, max) using rejection sampling. */
function randomIndex(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  let value: number;
  do {
    crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= limit);
  return value % max;
}

/**
 * Generate a password from the given options.
 * Throws if no character set is selected.
 */
export function generatePassword(options: PasswordOptions): string {
  const pool = buildPool(options);
  if (pool.length === 0) {
    throw new Error("Select at least one character set");
  }

  const length = Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, Math.trunc(options.length)));
  let password = "";
  for (let i = 0; i < length; i += 1) {
    password += pool[randomIndex(pool.length)];
  }
  return password;
}

export type PasswordStrength = "weak" | "fair" | "strong" | "excellent";

/**
 * A rough strength estimate based on Shannon entropy (bits) of the chosen
 * pool size and length. Purely informational.
 */
export function estimateStrength(options: PasswordOptions): {
  bits: number;
  label: PasswordStrength;
} {
  const pool = buildPool(options);
  const length = Math.max(0, Math.trunc(options.length));
  const bits = pool.length > 1 ? Math.round(length * Math.log2(pool.length)) : 0;

  let label: PasswordStrength = "weak";
  if (bits >= 120) label = "excellent";
  else if (bits >= 80) label = "strong";
  else if (bits >= 50) label = "fair";

  return { bits, label };
}

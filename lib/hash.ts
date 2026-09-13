/**
 * Cryptographic hashing via the Web Crypto API.
 *
 * A hash is a fixed-length fingerprint of some input: the same input always
 * gives the same digest, and changing a single character changes all of it.
 * That is what makes it useful for checking a download arrived intact, or
 * that two files are identical without comparing them byte by byte.
 *
 * MD5 is deliberately absent. Web Crypto does not implement it, because it
 * has been known to be forgeable for two decades, so anything relying on it for
 * security is already broken.
 */

export type HashAlgorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

export interface HashOption {
  value: HashAlgorithm;
  label: string;
  /** Digest length in hex characters, so the UI can size the field. */
  digits: number;
  note?: string;
}

export const HASH_ALGORITHMS: HashOption[] = [
  {
    value: "SHA-1",
    label: "SHA-1",
    digits: 40,
    note: "Broken for security. Fine for a checksum, not for signatures.",
  },
  { value: "SHA-256", label: "SHA-256", digits: 64 },
  { value: "SHA-384", label: "SHA-384", digits: 96 },
  { value: "SHA-512", label: "SHA-512", digits: 128 },
];

export const DEFAULT_ALGORITHM: HashAlgorithm = "SHA-256";

/** Render a digest as lowercase hex. */
export function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Render a digest as base64, which is how many manifests quote them. */
export function toBase64(buffer: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export interface HashResult {
  hex: string;
  base64: string;
}

/** Hash a string, encoded as UTF-8. */
export async function hashText(
  text: string,
  algorithm: HashAlgorithm,
): Promise<HashResult> {
  const bytes = new TextEncoder().encode(text);
  return hashBytes(bytes, algorithm);
}

/** Hash raw bytes, used for files, which are read in one go. */
export async function hashBytes(
  bytes: Uint8Array | ArrayBuffer,
  algorithm: HashAlgorithm,
): Promise<HashResult> {
  const buffer = await crypto.subtle.digest(
    algorithm,
    bytes instanceof Uint8Array ? (bytes.slice().buffer as ArrayBuffer) : bytes,
  );
  return { hex: toHex(buffer), base64: toBase64(buffer) };
}

/**
 * Compare a digest against one the user pasted in, ignoring case, spacing and
 * any filename a `shasum` line carries alongside it.
 */
export function digestsMatch(digest: string, expected: string): boolean {
  const clean = (value: string) =>
    value.trim().toLowerCase().split(/\s+/)[0] ?? "";
  const wanted = clean(expected);
  return wanted !== "" && clean(digest) === wanted;
}

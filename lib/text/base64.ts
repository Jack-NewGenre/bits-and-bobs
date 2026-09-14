/**
 * Base64 encode/decode for text, UTF-8 safe. Pure functions, no DOM.
 *
 * `btoa`/`atob` only handle Latin-1, so text is routed through TextEncoder /
 * TextDecoder to round-trip arbitrary Unicode correctly.
 */

export type Base64Mode = "encode" | "decode";

export interface Base64Result {
  ok: boolean;
  value: string;
  error?: string;
}

function bytesToBinary(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return binary;
}

function binaryToBytes(binary: string): Uint8Array {
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Make a standard Base64 string URL-safe (`+/` -> `-_`, no padding). */
export function toUrlSafe(base64: string): string {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Restore padding and `+/` so a URL-safe string can be decoded. */
export function fromUrlSafe(input: string): string {
  const restored = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = restored.length % 4;
  return pad === 0 ? restored : restored + "=".repeat(4 - pad);
}

/** Encode UTF-8 text as Base64. */
export function encodeBase64(text: string, urlSafe = false): Base64Result {
  try {
    const bytes = new TextEncoder().encode(text);
    const base64 = btoa(bytesToBinary(bytes));
    return { ok: true, value: urlSafe ? toUrlSafe(base64) : base64 };
  } catch {
    return { ok: false, value: "", error: "Could not encode this text" };
  }
}

/**
 * Whether a string uses the URL-safe alphabet. `-` and `_` are only valid in
 * that variant, so their presence is a reliable tell, and the reason a
 * paste from a URL or a JWT fails to decode as standard Base64.
 */
export function looksUrlSafe(input: string): boolean {
  return /[-_]/.test(input);
}

/** Decode Base64 (standard or URL-safe) back to UTF-8 text. */
export function decodeBase64(input: string, urlSafe = false): Base64Result {
  const trimmed = input.trim();
  if (trimmed === "") return { ok: true, value: "" };
  try {
    const normalised = urlSafe ? fromUrlSafe(trimmed) : trimmed;
    const bytes = binaryToBytes(atob(normalised));
    return { ok: true, value: new TextDecoder().decode(bytes) };
  } catch {
    return {
      ok: false,
      value: "",
      error:
        !urlSafe && looksUrlSafe(trimmed)
          ? "Not valid standard Base64. It contains - or _, so try the URL-safe toggle."
          : "Not a valid Base64 string",
    };
  }
}

/** Run the requested conversion. */
export function convertBase64(
  input: string,
  mode: Base64Mode,
  urlSafe = false,
): Base64Result {
  return mode === "encode"
    ? encodeBase64(input, urlSafe)
    : decodeBase64(input, urlSafe);
}

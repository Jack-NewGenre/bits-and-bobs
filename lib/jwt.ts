/**
 * JWT decoding.
 *
 * A JWT is three base64url chunks joined by dots: a header saying how it was
 * signed, a payload of claims, and a signature over the first two. Only the
 * signature is secret-dependent. The header and payload are merely *encoded*,
 * not encrypted, so anyone holding the token can read them. That is exactly
 * what this tool shows, and why a JWT is never a place for secrets.
 *
 * Nothing here verifies the signature: that needs the issuer's key, which
 * belongs on a server, not in a browser tab.
 */

import { fromUrlSafe } from "@/lib/base64";

export interface JwtClaim {
  name: string;
  value: string;
  /** Set for the registered time claims, rendered as a readable date. */
  readable?: string;
  description?: string;
}

export interface JwtResult {
  ok: boolean;
  header?: string;
  payload?: string;
  signature?: string;
  claims?: JwtClaim[];
  /** Undefined when the token carries no `exp`. */
  expired?: boolean;
  /**
   * True when the header claims `alg: none`, an unsigned token. Naive
   * verifiers that trust the header have been tricked into accepting these,
   * so it is worth calling out rather than quietly decoding.
   */
  unsigned?: boolean;
  error?: string;
}

/** What the registered claim names mean, for the ones people meet most. */
const CLAIM_NOTES: Record<string, string> = {
  iss: "Issuer: who minted the token",
  sub: "Subject: who it is about",
  aud: "Audience: who it is for",
  exp: "Expires at",
  nbf: "Not valid before",
  iat: "Issued at",
  jti: "Token ID, for revocation or replay checks",
  alg: "Signing algorithm",
  typ: "Token type",
  kid: "Key ID: which key signed it",
};

const TIME_CLAIMS = new Set(["exp", "nbf", "iat", "auth_time", "updated_at"]);

function decodeSegment(segment: string): unknown {
  const binary = atob(fromUrlSafe(segment));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

/** Seconds since the epoch, rendered in the reader's own timezone. */
export function readableTime(seconds: number): string {
  return new Date(seconds * 1000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

/** Flatten a decoded object into a list of claims with explanations. */
export function toClaims(source: unknown): JwtClaim[] {
  if (source === null || typeof source !== "object") return [];

  return Object.entries(source as Record<string, unknown>).map(
    ([name, raw]) => {
      const value =
        typeof raw === "string" ? raw : JSON.stringify(raw) ?? String(raw);
      const isTime = TIME_CLAIMS.has(name) && typeof raw === "number";

      return {
        name,
        value,
        readable: isTime ? readableTime(raw as number) : undefined,
        description: CLAIM_NOTES[name],
      };
    },
  );
}

/**
 * Decode a token into its parts. Returns a described failure rather than
 * throwing, so a half-pasted token just shows what is wrong with it.
 */
export function decodeJwt(token: string, now = Date.now()): JwtResult {
  const trimmed = token.trim().replace(/^Bearer\s+/i, "");
  if (trimmed === "") return { ok: false };

  const parts = trimmed.split(".");
  if (parts.length !== 3) {
    return {
      ok: false,
      error: `A JWT has three dot-separated parts; this has ${parts.length}.`,
    };
  }

  let header: unknown;
  let payload: unknown;
  try {
    header = decodeSegment(parts[0]);
  } catch {
    return { ok: false, error: "The header is not valid base64url JSON." };
  }
  try {
    payload = decodeSegment(parts[1]);
  } catch {
    return { ok: false, error: "The payload is not valid base64url JSON." };
  }

  const exp = (payload as Record<string, unknown> | null)?.exp;
  const alg = (header as Record<string, unknown> | null)?.alg;

  return {
    ok: true,
    unsigned: typeof alg === "string" && alg.toLowerCase() === "none",
    header: JSON.stringify(header, null, 2),
    payload: JSON.stringify(payload, null, 2),
    signature: parts[2],
    claims: [...toClaims(header), ...toClaims(payload)],
    expired: typeof exp === "number" ? exp * 1000 < now : undefined,
  };
}

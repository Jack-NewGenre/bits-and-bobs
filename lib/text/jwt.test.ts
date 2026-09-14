import { describe, expect, it } from "vitest";

import { decodeJwt, readableTime, toClaims } from "@/lib/text/jwt";

/** Build a token from a header and payload, with a fake signature. */
function makeToken(header: object, payload: object): string {
  const encode = (value: object) => {
    // Real tokens base64 the UTF-8 bytes; btoa alone only handles Latin-1.
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    const binary = String.fromCharCode(...bytes);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  return `${encode(header)}.${encode(payload)}.fake-signature`;
}

const HEADER = { alg: "HS256", typ: "JWT" };
const NOW = Date.UTC(2026, 0, 1);

describe("decodeJwt", () => {
  it("splits a token into its three parts", () => {
    const token = makeToken(HEADER, { sub: "123", name: "Ada" });
    const result = decodeJwt(token, NOW);

    expect(result.ok).toBe(true);
    expect(result.header).toContain('"alg": "HS256"');
    expect(result.payload).toContain('"name": "Ada"');
    expect(result.signature).toBe("fake-signature");
  });

  it("ignores a Bearer prefix and surrounding space", () => {
    const token = makeToken(HEADER, { sub: "1" });
    expect(decodeJwt(`  Bearer ${token}  `, NOW).ok).toBe(true);
  });

  it("says nothing at all for an empty input", () => {
    expect(decodeJwt("", NOW)).toEqual({ ok: false });
  });

  it("explains a token with the wrong number of parts", () => {
    expect(decodeJwt("just.two", NOW).error).toContain("three");
  });

  it("names which part failed to decode", () => {
    const token = makeToken(HEADER, { sub: "1" });
    const [head, , signature] = token.split(".");
    expect(decodeJwt(`${head}.###.${signature}`, NOW).error).toContain("payload");
    expect(decodeJwt(`###.${head}.${signature}`, NOW).error).toContain("header");
  });

  it("decodes non-ASCII claims correctly", () => {
    const token = makeToken(HEADER, { name: "Ana Lucía" });
    expect(decodeJwt(token, NOW).payload).toContain("Ana Lucía");
  });

  describe("unsigned tokens", () => {
    it("flags a token that claims alg: none", () => {
      const encode = (value: object) =>
        btoa(JSON.stringify(value)).replace(/=+$/, "");
      const token = `${encode({ alg: "none" })}.${encode({ sub: "1" })}.`;
      expect(decodeJwt(token, NOW).unsigned).toBe(true);
    });

    it("does not flag a normally signed token", () => {
      expect(decodeJwt(makeToken(HEADER, { sub: "1" }), NOW).unsigned).toBe(false);
    });
  });

  describe("expiry", () => {
    it("flags a token whose exp has passed", () => {
      const token = makeToken(HEADER, { exp: NOW / 1000 - 60 });
      expect(decodeJwt(token, NOW).expired).toBe(true);
    });

    it("clears the flag for one still valid", () => {
      const token = makeToken(HEADER, { exp: NOW / 1000 + 60 });
      expect(decodeJwt(token, NOW).expired).toBe(false);
    });

    it("leaves it undefined when there is no exp to judge", () => {
      const token = makeToken(HEADER, { sub: "1" });
      expect(decodeJwt(token, NOW).expired).toBeUndefined();
    });
  });
});

describe("toClaims", () => {
  it("explains the registered claim names", () => {
    const [claim] = toClaims({ iss: "https://example.com" });
    expect(claim).toMatchObject({
      name: "iss",
      value: "https://example.com",
      description: expect.stringContaining("Issuer"),
    });
  });

  it("renders the time claims as readable dates", () => {
    const [claim] = toClaims({ exp: 1767225600 });
    expect(claim.readable).toBe(readableTime(1767225600));
    expect(claim.readable).not.toBe("");
  });

  it("leaves a non-time claim without a date", () => {
    expect(toClaims({ sub: "123" })[0].readable).toBeUndefined();
  });

  it("stringifies structured claims", () => {
    expect(toClaims({ roles: ["a", "b"] })[0].value).toBe('["a","b"]');
  });

  it("copes with a payload that is not an object", () => {
    expect(toClaims("nope")).toEqual([]);
    expect(toClaims(null)).toEqual([]);
  });
});

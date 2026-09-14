import { describe, expect, it } from "vitest";

import {
  digestsMatch,
  hashBytes,
  hashText,
  HASH_ALGORITHMS,
  toBase64,
  toHex,
} from "@/lib/text/hash";

/** Known-good digests of the empty string and "abc". */
const KNOWN = {
  "SHA-1": {
    empty: "da39a3ee5e6b4b0d3255bfef95601890afd80709",
    abc: "a9993e364706816aba3e25717850c26c9cd0d89d",
  },
  "SHA-256": {
    empty: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    abc: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  },
} as const;

describe("toHex", () => {
  it("pads each byte to two digits", () => {
    expect(toHex(new Uint8Array([0, 15, 255]).buffer)).toBe("000fff");
  });
});

describe("toBase64", () => {
  it("encodes the raw digest bytes", () => {
    expect(toBase64(new Uint8Array([1, 2, 3]).buffer)).toBe("AQID");
  });
});

describe("hashText", () => {
  it("matches the published digests", async () => {
    for (const algorithm of ["SHA-1", "SHA-256"] as const) {
      expect((await hashText("", algorithm)).hex).toBe(KNOWN[algorithm].empty);
      expect((await hashText("abc", algorithm)).hex).toBe(KNOWN[algorithm].abc);
    }
  });

  it("produces the digest length each algorithm advertises", async () => {
    for (const option of HASH_ALGORITHMS) {
      const { hex } = await hashText("abc", option.value);
      expect(hex).toHaveLength(option.digits);
    }
  });

  it("changes completely when one character changes", async () => {
    const first = (await hashText("abc", "SHA-256")).hex;
    const second = (await hashText("abd", "SHA-256")).hex;

    const shared = [...first].filter((char, i) => char === second[i]).length;
    // An avalanche: about 1 in 16 hex digits will coincide by chance.
    expect(shared).toBeLessThan(first.length / 2);
  });

  it("hashes UTF-8 bytes, so non-ASCII is stable", async () => {
    const direct = await hashText("café", "SHA-256");
    const bytes = await hashBytes(new TextEncoder().encode("café"), "SHA-256");
    expect(direct.hex).toBe(bytes.hex);
  });

  it("returns both hex and base64 of the same digest", async () => {
    const { hex, base64 } = await hashText("abc", "SHA-256");
    expect(atob(base64).length).toBe(hex.length / 2);
  });
});

describe("digestsMatch", () => {
  const digest = "a9993e364706816aba3e25717850c26c9cd0d89d";

  it("ignores case and surrounding space", () => {
    expect(digestsMatch(digest, `  ${digest.toUpperCase()} `)).toBe(true);
  });

  it("ignores the filename a shasum line carries", () => {
    expect(digestsMatch(digest, `${digest}  archive.tar.gz`)).toBe(true);
  });

  it("is false for a different digest, and for nothing at all", () => {
    expect(digestsMatch(digest, "deadbeef")).toBe(false);
    expect(digestsMatch(digest, "   ")).toBe(false);
  });
});

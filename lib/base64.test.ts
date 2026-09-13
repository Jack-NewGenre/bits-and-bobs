import { describe, expect, it } from "vitest";

import {
  convertBase64,
  decodeBase64,
  encodeBase64,
  fromUrlSafe,
  toUrlSafe,
} from "@/lib/base64";

describe("encode/decode round-trip", () => {
  it("handles plain ASCII", () => {
    const encoded = encodeBase64("Hello, world!");
    expect(encoded).toEqual({ ok: true, value: "SGVsbG8sIHdvcmxkIQ==" });
    expect(decodeBase64(encoded.value).value).toBe("Hello, world!");
  });

  it("round-trips multibyte Unicode", () => {
    const text = "café / 日本語 / 🚀";
    const encoded = encodeBase64(text);
    expect(encoded.ok).toBe(true);
    expect(decodeBase64(encoded.value).value).toBe(text);
  });

  it("encodes an empty string to empty and back", () => {
    expect(encodeBase64("").value).toBe("");
    expect(decodeBase64("").value).toBe("");
  });
});

describe("decodeBase64", () => {
  it("reports invalid input", () => {
    const result = decodeBase64("not valid base64!!!");
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("url-safe variants", () => {
  it("converts to and from url-safe", () => {
    const standard = "ab+/cd==";
    const urlSafe = toUrlSafe(standard);
    expect(urlSafe).toBe("ab-_cd");
    expect(fromUrlSafe(urlSafe)).toBe("ab+/cd==");
  });

  it("round-trips text through url-safe encoding", () => {
    const text = "subjects?id=1&q=a/b+c";
    const encoded = encodeBase64(text, true);
    expect(encoded.value).not.toMatch(/[+/=]/);
    expect(decodeBase64(encoded.value, true).value).toBe(text);
  });
});

describe("convertBase64", () => {
  it("dispatches on mode", () => {
    expect(convertBase64("hi", "encode").value).toBe("aGk=");
    expect(convertBase64("aGk=", "decode").value).toBe("hi");
  });
});

describe("URL-safe guidance", () => {
  it("points at the toggle when the input is clearly URL-safe", () => {
    const result = decodeBase64("SGVsbG8_d29ybGQ-Zm9v");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("URL-safe");
  });

  it("gives the plain error for input that is simply not Base64", () => {
    const result = decodeBase64("!!!nope!!!");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Not a valid Base64 string");
  });

  it("decodes the same input once the toggle is on", () => {
    expect(decodeBase64("SGVsbG8_d29ybGQ-Zm9v", true)).toEqual({
      ok: true,
      value: "Hello?world>foo",
    });
  });
});


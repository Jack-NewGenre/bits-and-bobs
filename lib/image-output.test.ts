import { describe, expect, it } from "vitest";

import {
  isLossy,
  needsMatte,
  outputTypeFor,
  resolveFormat,
} from "@/lib/image-output";

describe("resolveFormat", () => {
  it("keeps a lossy source format when asked for the same one", () => {
    expect(resolveFormat("source", "image/jpeg")).toBe("image/jpeg");
    expect(resolveFormat("source", "image/webp")).toBe("image/webp");
  });

  it("falls back to png for anything else", () => {
    expect(resolveFormat("source", "image/gif")).toBe("image/png");
    expect(resolveFormat("source", undefined)).toBe("image/png");
  });

  it("honours an explicit choice", () => {
    expect(resolveFormat("image/webp", "image/jpeg")).toBe("image/webp");
  });
});

describe("isLossy", () => {
  it("is true only where the quality setting does something", () => {
    expect(isLossy("image/jpeg")).toBe(true);
    expect(isLossy("image/webp")).toBe(true);
    expect(isLossy("image/png")).toBe(false);
    expect(isLossy("source", "image/jpeg")).toBe(true);
    expect(isLossy("source", "image/png")).toBe(false);
  });
});

describe("needsMatte", () => {
  it("is true only for jpeg, which has no alpha channel", () => {
    expect(needsMatte("image/jpeg")).toBe(true);
    expect(needsMatte("source", "image/jpeg")).toBe(true);
    expect(needsMatte("image/png")).toBe(false);
    expect(needsMatte("image/webp")).toBe(false);
  });
});

describe("outputTypeFor", () => {
  it("keeps jpeg and webp, defaults to png", () => {
    expect(outputTypeFor("image/jpeg")).toEqual({
      type: "image/jpeg",
      quality: 0.92,
    });
    expect(outputTypeFor("image/webp")).toEqual({
      type: "image/webp",
      quality: 0.92,
    });
    expect(outputTypeFor("image/png")).toEqual({ type: "image/png" });
    expect(outputTypeFor(undefined)).toEqual({ type: "image/png" });
  });

  it("honours an explicit format over the source's", () => {
    expect(outputTypeFor("image/png", "image/webp", 80)).toEqual({
      type: "image/webp",
      quality: 0.8,
    });
    expect(outputTypeFor("image/jpeg", "image/png")).toEqual({
      type: "image/png",
    });
  });

  it("never attaches a quality to png, which is lossless", () => {
    expect(outputTypeFor("image/png", "source", 50)).toEqual({
      type: "image/png",
    });
  });

  it("clamps the quality into the encoder's range", () => {
    expect(outputTypeFor("image/jpeg", "source", 500)).toEqual({
      type: "image/jpeg",
      quality: 1,
    });
    expect(outputTypeFor("image/jpeg", "source", -20)).toEqual({
      type: "image/jpeg",
      quality: 0.01,
    });
  });
});

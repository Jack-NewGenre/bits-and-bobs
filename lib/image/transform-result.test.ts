import { describe, expect, it } from "vitest";

import {
  percentSmaller,
  shouldSuggestWebp,
  transformedName,
} from "@/lib/image/transform-result";

describe("percentSmaller", () => {
  it("reports a saving as a positive percentage", () => {
    expect(percentSmaller(1000, 250)).toBe(75);
    expect(percentSmaller(1000, 900)).toBe(10);
  });

  it("reports growth as a negative percentage", () => {
    expect(percentSmaller(1000, 1500)).toBe(-50);
  });

  it("is zero for no change, and for an empty input", () => {
    expect(percentSmaller(1000, 1000)).toBe(0);
    expect(percentSmaller(0, 500)).toBe(0);
  });
});

describe("transformedName", () => {
  it("follows the format the blob actually encoded to", () => {
    const webp = new Blob([], { type: "image/webp" });
    expect(transformedName("photo.png", webp, "")).toBe("photo.webp");
  });

  it("adds the tool's suffix before the extension", () => {
    const jpeg = new Blob([], { type: "image/jpeg" });
    expect(transformedName("photo.png", jpeg, "-compressed")).toBe(
      "photo-compressed.jpg",
    );
  });

  it("copes with a name that has no extension", () => {
    const png = new Blob([], { type: "image/png" });
    expect(transformedName("photo", png, "-resized")).toBe("photo-resized.png");
  });
});

describe("shouldSuggestWebp", () => {
  it("offers a way out when the output came back bigger", () => {
    expect(shouldSuggestWebp(-56, "source", "image/png")).toBe(true);
    expect(shouldSuggestWebp(-1, "image/png")).toBe(true);
  });

  it("stays quiet when the output actually shrank", () => {
    expect(shouldSuggestWebp(40, "source", "image/png")).toBe(false);
    expect(shouldSuggestWebp(0, "image/png")).toBe(false);
  });

  it("never suggests the format already in use", () => {
    expect(shouldSuggestWebp(-56, "image/webp")).toBe(false);
    expect(shouldSuggestWebp(-56, "source", "image/webp")).toBe(false);
  });
});

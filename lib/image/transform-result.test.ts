import { describe, expect, it } from "vitest";

import {
  shouldSuggestWebp,
  transformedName,
} from "@/lib/image/transform-result";

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

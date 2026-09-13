import { describe, expect, it } from "vitest";

import {
  extensionForType,
  toPngName,
  uniqueNames,
  withSuffix,
} from "@/lib/download";

describe("toPngName", () => {
  it("swaps any extension for .png", () => {
    expect(toPngName("photo.jpg")).toBe("photo.png");
    expect(toPngName("photo.webp")).toBe("photo.png");
  });

  it("appends .png when there is no extension", () => {
    expect(toPngName("photo")).toBe("photo.png");
  });
});

describe("extensionForType", () => {
  it("maps known MIME types", () => {
    expect(extensionForType("image/png")).toBe("png");
    expect(extensionForType("image/jpeg")).toBe("jpg");
    expect(extensionForType("image/webp")).toBe("webp");
  });

  it("defaults unknown types to png", () => {
    expect(extensionForType("application/octet-stream")).toBe("png");
  });
});

describe("withSuffix", () => {
  it("inserts the suffix before the extension", () => {
    expect(withSuffix("photo.jpg", "-enhanced")).toBe("photo-enhanced.jpg");
  });

  it("swaps the extension when one is supplied", () => {
    expect(withSuffix("photo.jpg", "-enhanced", "webp")).toBe(
      "photo-enhanced.webp",
    );
  });
});

describe("uniqueNames", () => {
  const blob = new Blob(["a"]);

  it("leaves distinct names alone", () => {
    const named = uniqueNames([
      { name: "a.png", blob },
      { name: "b.png", blob },
    ]);
    expect(named.map((entry) => entry.name)).toEqual(["a.png", "b.png"]);
  });

  it("de-duplicates colliding non-png names without dropping entries", () => {
    const named = uniqueNames([
      { name: "photo-enhanced.jpg", blob },
      { name: "photo-enhanced.jpg", blob },
    ]);
    expect(named.map((entry) => entry.name)).toEqual([
      "photo-enhanced.jpg",
      "photo-enhanced-1.jpg",
    ]);
  });

  it("de-duplicates png names too", () => {
    const named = uniqueNames([
      { name: "cutout.png", blob },
      { name: "cutout.png", blob },
      { name: "cutout.png", blob },
    ]);
    expect(named.map((entry) => entry.name)).toEqual([
      "cutout.png",
      "cutout-1.png",
      "cutout-2.png",
    ]);
  });

  it("de-duplicates names without an extension", () => {
    const named = uniqueNames([
      { name: "image", blob },
      { name: "image", blob },
    ]);
    expect(named.map((entry) => entry.name)).toEqual(["image", "image-1"]);
  });
});

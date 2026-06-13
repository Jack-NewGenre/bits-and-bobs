import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  downloadZip,
  extensionForType,
  toPngName,
  withSuffix,
} from "@/lib/download";

const fileMock = vi.fn();

vi.mock("jszip", () => ({
  default: class {
    file = fileMock;
    generateAsync = vi.fn(async () => new Blob(["zip"]));
  },
}));

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

describe("downloadZip", () => {
  beforeEach(() => {
    fileMock.mockClear();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:zip"),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(document, "createElement").mockReturnValue({
      href: "",
      download: "",
      click: vi.fn(),
      remove: vi.fn(),
    } as unknown as HTMLAnchorElement);
    vi.spyOn(document.body, "appendChild").mockImplementation(
      ((node: Node) => node) as typeof document.body.appendChild,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("de-duplicates colliding non-png names without dropping entries", async () => {
    const blob = new Blob(["a"], { type: "image/jpeg" });
    await downloadZip(
      [
        { name: "photo-enhanced.jpg", blob },
        { name: "photo-enhanced.jpg", blob },
      ],
      "out.zip",
    );

    const usedNames = fileMock.mock.calls.map((call) => call[0]);
    expect(usedNames).toEqual(["photo-enhanced.jpg", "photo-enhanced-1.jpg"]);
    // No collision: both entries are written under distinct names.
    expect(new Set(usedNames).size).toBe(2);
  });

  it("de-duplicates png names too", async () => {
    const blob = new Blob(["a"], { type: "image/png" });
    await downloadZip(
      [
        { name: "cutout.png", blob },
        { name: "cutout.png", blob },
      ],
      "out.zip",
    );

    const usedNames = fileMock.mock.calls.map((call) => call[0]);
    expect(usedNames).toEqual(["cutout.png", "cutout-1.png"]);
  });

  it("de-duplicates names without an extension", async () => {
    const blob = new Blob(["a"]);
    await downloadZip(
      [
        { name: "image", blob },
        { name: "image", blob },
      ],
      "out.zip",
    );

    const usedNames = fileMock.mock.calls.map((call) => call[0]);
    expect(usedNames).toEqual(["image", "image-1"]);
  });
});

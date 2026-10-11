import { describe, expect, it } from "vitest";

import {
  clearHandedOffFiles,
  handOffFiles,
  navigatesInPlace,
  takeHandedOffFiles,
} from "@/lib/file-handoff";

const file = (name: string) => new File(["x"], name, { type: "image/png" });

describe("file handoff", () => {
  it("returns nothing when no files are waiting", () => {
    expect(takeHandedOffFiles()).toEqual([]);
  });

  it("hands files over exactly once", () => {
    const files = [file("a.png"), file("b.png")];
    handOffFiles(files);
    expect(takeHandedOffFiles()).toEqual(files);
    expect(takeHandedOffFiles()).toEqual([]);
  });

  it("replaces files that were never taken", () => {
    handOffFiles([file("old.png")]);
    handOffFiles([file("new.png")]);
    expect(takeHandedOffFiles().map((f) => f.name)).toEqual(["new.png"]);
  });

  it("forgets files that were cleared", () => {
    handOffFiles([file("a.png")]);
    clearHandedOffFiles();
    expect(takeHandedOffFiles()).toEqual([]);
  });
});

describe("navigatesInPlace", () => {
  const plain = {
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
  };

  it("is true for a plain left click", () => {
    expect(navigatesInPlace(plain)).toBe(true);
  });

  it.each([
    { button: 1 },
    { metaKey: true },
    { ctrlKey: true },
    { shiftKey: true },
    { altKey: true },
  ])("is false for a click that opens a new tab: %o", (change) => {
    expect(navigatesInPlace({ ...plain, ...change })).toBe(false);
  });
});

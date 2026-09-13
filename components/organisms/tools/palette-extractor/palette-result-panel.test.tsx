import { describe, expect, it } from "vitest";

import { toThemeBlock } from "@/components/organisms/tools/palette-extractor/palette-result-panel";

const entries = [
  { colour: { r: 255, g: 0, b: 0, a: 1 }, share: 0.6 },
  { colour: { r: 0, g: 0, b: 255, a: 1 }, share: 0.4 },
];

describe("toThemeBlock", () => {
  it("names each swatch by its rank", () => {
    const block = toThemeBlock(entries);
    expect(block).toContain("--color-swatch-1:");
    expect(block).toContain("--color-swatch-2:");
  });

  it("emits OKLCH, which is what Tailwind v4 expects", () => {
    expect(toThemeBlock(entries)).toContain("oklch(");
  });

  it("wraps everything in a theme block", () => {
    const block = toThemeBlock(entries);
    expect(block.startsWith("@theme {")).toBe(true);
    expect(block.endsWith("}")).toBe(true);
  });

  it("copes with an empty palette", () => {
    expect(toThemeBlock([])).toBe("@theme {\n\n}");
  });
});

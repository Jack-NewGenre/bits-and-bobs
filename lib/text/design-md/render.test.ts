import { describe, expect, it } from "vitest";

import { STARTER_TOKENS } from "@/lib/text/design-md/normalise";
import { renderDesignMd } from "@/lib/text/design-md/render";

const TOKENS = {
  ...STARTER_TOKENS,
  name: "Acme",
  source: "https://acme.test",
  overview: "A calm, light interface.",
  colours: [
    ...STARTER_TOKENS.colours,
    { name: "--brand", value: "#635bff" },
    { name: "", value: "#000000" },
  ],
  components: [{ name: "Button", value: "color: #ffffff; padding: 8px 16px" }],
};

describe("renderDesignMd", () => {
  const markdown = renderDesignMd(TOKENS);

  it("puts the tokens in YAML front matter, quoting awkward keys", () => {
    expect(markdown.startsWith('---\nname: "Acme"\nsource: "https://acme.test"\n')).toBe(true);
    expect(markdown).toContain('  primary: "#2563eb"');
    expect(markdown).toContain('  "--brand": "#635bff"');
    expect(markdown).not.toContain('"#000000"');
  });

  it("credits the source and includes the overview", () => {
    expect(markdown).toContain("# Acme design system");
    expect(markdown).toContain("Captured from https://acme.test");
    expect(markdown).toContain("A calm, light interface.");
  });

  it("grades the contrast of text on its surface", () => {
    expect(markdown).toMatch(/`foreground` on `background`: [\d.]+:1 \(AAA\)/);
    expect(markdown).toMatch(/`primary-foreground` on `primary`: [\d.]+:1/);
  });

  it("lists the type scale and spots the spacing grid", () => {
    expect(markdown).toContain("- `h1`: 36px / 1.2 / 700");
    expect(markdown).toContain("Every spacing value is a multiple of 4px.");
  });

  it("lists component styles and a theme snippet", () => {
    expect(markdown).toContain("### Button\n\n- color: #ffffff\n- padding: 8px 16px");
    expect(markdown).toContain("  --primary: #2563eb;");
    expect(markdown).toContain("  --brand: #635bff;");
    expect(markdown).toContain("  --radius-md: 8px;");
  });

  it("still renders with nothing filled in", () => {
    const empty = renderDesignMd({
      ...STARTER_TOKENS,
      colours: [],
      fonts: [],
      typeScale: [],
      spacing: [],
      radii: [],
    });
    expect(empty).toContain("# Untitled design system");
    expect(empty).not.toContain("## Colour contrast");
    expect(empty).not.toContain("## Theme snippet");
  });
});

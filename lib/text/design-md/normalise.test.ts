import { describe, expect, it } from "vitest";

import { byUse, hexInside, toHex } from "@/lib/text/design-md/design-colours";
import { toDesignTokens } from "@/lib/text/design-md/normalise";
import { captureFromCss } from "@/lib/text/design-md/parse-css";

const CSS = `
  :root { --brand: #635bff; --ink: #0a2540; --font: "Inter", sans-serif; }
  body { background: #ffffff; color: var(--ink); font-family: var(--font); font-size: 16px; line-height: 24px; }
  h1 { font-size: 40px; font-weight: 700; }
  button { background-color: var(--brand); color: #fff; padding: 8px 16px; border-radius: 6px; }
  .card { border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.1); padding: 24px; }
`;

const valueOf = (tokens: { name: string; value: string }[], name: string) =>
  tokens.find((token) => token.name === name)?.value;

describe("design colour helpers", () => {
  it("converts any CSS colour to hex", () => {
    expect(toHex("#fff")).toBe("#ffffff");
    expect(toHex("rgb(99, 91, 255)")).toBe("#635bff");
    expect(toHex("not a colour")).toBeUndefined();
  });

  it("rewrites colours inside a longer value", () => {
    expect(hexInside("0 1px 3px rgba(0,0,0,.1)")).toBe("0 1px 3px #0000001a");
  });

  it("orders values from most to least used", () => {
    expect(byUse({ a: 1, b: 3, c: 2 })).toEqual(["b", "c", "a"]);
  });
});

describe("toDesignTokens", () => {
  const tokens = toDesignTokens(captureFromCss(CSS, "Acme"));

  it("names the main colour roles", () => {
    expect(valueOf(tokens.colours, "background")).toBe("#ffffff");
    expect(valueOf(tokens.colours, "foreground")).toBe("#0a2540");
    expect(valueOf(tokens.colours, "primary")).toBe("#635bff");
    expect(valueOf(tokens.colours, "primary-foreground")).toBe("#ffffff");
  });

  it("keeps the site's own colour variables", () => {
    expect(valueOf(tokens.colours, "--brand")).toBe("#635bff");
  });

  it("writes every type style as size / line height / weight", () => {
    expect(valueOf(tokens.typeScale, "h1")).toBe("40px / normal / 700");
    expect(valueOf(tokens.typeScale, "body")).toBe("16px / 1.5 / 400");
  });

  it("sorts spacing and radii from small to large", () => {
    expect(tokens.spacing.map((token) => token.value)).toEqual(["8px", "16px", "24px"]);
    expect(tokens.radii.map((token) => token.value)).toEqual(["6px", "12px"]);
  });

  it("describes components with hex colours", () => {
    expect(valueOf(tokens.components, "Button")).toContain("background-color: #635bff");
    expect(valueOf(tokens.components, "Card")).toContain("#0000001a");
  });

  it("writes an overview from the theme", () => {
    expect(tokens.name).toBe("Acme");
    expect(tokens.overview).toContain("light theme");
    expect(tokens.overview).toContain("#635bff");
  });
});

describe("toDesignTokens without a body rule", () => {
  it("does not mistake a component's background for the page", () => {
    const tokens = toDesignTokens(
      captureFromCss(":root { --brand: #ff0066 } button { background: var(--brand); color: #fff }")
    );
    expect(valueOf(tokens.colours, "background")).toBeUndefined();
    expect(valueOf(tokens.colours, "foreground")).toBeUndefined();
    expect(valueOf(tokens.colours, "primary")).toBe("#ff0066");
  });
});

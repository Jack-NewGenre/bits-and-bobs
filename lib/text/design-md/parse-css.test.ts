import { describe, expect, it } from "vitest";

import {
  captureFromCss,
  resolveVariables,
} from "@/lib/text/design-md/parse-css";

const CSS = `
  :root { --brand: #635bff; --ink: #0a2540; }
  body { background: #ffffff; color: var(--ink); font-size: 16px; }
  .btn, button { background-color: var(--brand); color: #fff; padding: 8px 16px; border-radius: 6px; }
  a { color: var(--brand); }
  .card { border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
`;

describe("resolveVariables", () => {
  it("follows nested fallbacks and leaves unknown variables alone", () => {
    expect(resolveVariables("var(--a, var(--b, 4px))", { b: "2px" })).toBe(
      "2px",
    );
    expect(resolveVariables("var(--a, var(--b, 4px))", {})).toBe("4px");
    expect(resolveVariables("var(--a)", {})).toBe("var(--a)");
  });
});

describe("captureFromCss", () => {
  it("reads root variables and resolves them in component styles", () => {
    const capture = captureFromCss(CSS, "Acme");
    expect(capture.title).toBe("Acme");
    expect(capture.variables).toEqual({ brand: "#635bff", ink: "#0a2540" });
    expect(capture.components.button?.["background-color"]).toBe("#635bff");
    expect(capture.components.link?.color).toBe("#635bff");
    expect(capture.components.body?.color).toBe("#0a2540");
  });

  it("counts how often each value is written", () => {
    const { counts } = captureFromCss(CSS);
    expect(counts.radii).toEqual({ "6px": 1, "12px": 1 });
    expect(counts.backgrounds["#635bff"]).toBe(1);
    expect(counts.shadows["0 1px 3px rgba(0,0,0,.1)"]).toBe(1);
  });

  it("returns an empty capture for CSS with no rules", () => {
    const capture = captureFromCss("not css at all");
    expect(capture.components).toEqual({});
    expect(capture.variables).toEqual({});
  });
});

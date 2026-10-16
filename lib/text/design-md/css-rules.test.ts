import { describe, expect, it } from "vitest";

import { parseCssRules, parseDeclarations, splitTopLevel } from "@/lib/text/design-md/css-rules";

describe("splitTopLevel", () => {
  it("ignores separators inside brackets and quotes", () => {
    expect(splitTopLevel('a, b(c, d), "e,f"', ",")).toEqual(["a", "b(c, d)", '"e,f"']);
  });
});

describe("parseDeclarations", () => {
  it("keeps semicolons that sit inside a value", () => {
    expect(parseDeclarations("color: red; background: url('a;b'); --x: 1")).toEqual([
      ["color", "red"],
      ["background", "url('a;b')"],
      ["--x", "1"],
    ]);
  });
});

describe("parseCssRules", () => {
  it("opens grouping rules and skips keyframes and imports", () => {
    const rules = parseCssRules(`
      @import url("x.css");
      @media (min-width: 600px) { body { padding: 16px; } }
      h1 { color: red; }
      @keyframes spin { from { transform: rotate(0) } }
    `);
    expect(rules).toEqual([
      { selector: "body", declarations: [["padding", "16px"]] },
      { selector: "h1", declarations: [["color", "red"]] },
    ]);
  });

  it("survives comments and unbalanced input", () => {
    const rules = parseCssRules("/* { */ a { color: blue; } b { color:");
    expect(rules[0]).toEqual({ selector: "a", declarations: [["color", "blue"]] });
    expect(rules.flatMap((rule) => rule.declarations)).toEqual([["color", "blue"]]);
  });
});

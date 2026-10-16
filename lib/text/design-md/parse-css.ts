import { parseCssRules, splitTopLevel, type CssRule } from "@/lib/text/design-md/css-rules";
import {
  COMPONENT_PROPERTIES,
  emptyCapture,
  type ComponentRole,
  type DesignCapture,
  type ValueCounts,
} from "@/lib/text/design-md/types";

const ROOT_SELECTOR = /^(:root|html|:host)$/i;
const STATE_PSEUDO = /:(hover|focus|focus-visible|focus-within|active|disabled|visited|checked)/i;
export const COLOUR_VALUE =
  /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^()]*(?:\([^()]*\)[^()]*)*\)/gi;
const LENGTH = /^(-?[\d.]+)(px|rem)$/;

/** Which selectors stand for which component, tried in order. */
const ROLE_SELECTORS: [ComponentRole, RegExp][] = [
  ["body", /^body$/i],
  ["h1", /^h1$/i],
  ["h2", /^h2$/i],
  ["h3", /^h3$/i],
  ["text", /^p$/i],
  ["link", /^a(:link)?$/i],
  ["button-secondary", /^(button|a)?\.[\w-]*(btn|button)[\w-]*(secondary|outline|ghost)[\w-]*$/i],
  ["button", /^(button|\.[\w-]*(btn|button)[\w-]*)$/i],
  ["input", /^(input|textarea|select)(\[[^\]]+\])?$|^\.[\w-]*(input|field)$/i],
  ["card", /^\.[\w-]*card$/i],
  ["badge", /^\.[\w-]*(badge|chip|tag|pill)$/i],
  ["nav", /^(header|nav|\.[\w-]*(navbar|header))$/i],
  ["code", /^(pre|code)$/i],
];

const bump = (bucket: ValueCounts, value: string) => {
  bucket[value] = (bucket[value] ?? 0) + 1;
};

/** Swaps `var(--name, fallback)` for the variable's value, a few levels deep. */
export function resolveVariables(value: string, variables: Record<string, string>): string {
  let resolved = value;
  for (let depth = 0; depth < 5 && resolved.includes("var("); depth++) {
    resolved = resolved.replace(
      /var\(\s*--([\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\)[^()]*)*))?\)/g,
      (match, name: string, fallback?: string) => variables[name] ?? fallback?.trim() ?? match
    );
  }
  return resolved;
}

function toPx(token: string): string | undefined {
  const match = LENGTH.exec(token);
  if (!match) return undefined;
  const px = Number(match[1]) * (match[2] === "rem" ? 16 : 1);
  return px > 0 ? `${Math.round(px * 100) / 100}px` : undefined;
}

function countDeclaration(counts: DesignCapture["counts"], property: string, value: string) {
  if (property.startsWith("--")) return;
  if (/^(color|background(-color)?|border(-[\w-]+)?|outline(-color)?|fill|stroke)$/.test(property)) {
    for (const colour of value.match(COLOUR_VALUE) ?? []) {
      bump(property.startsWith("background") ? counts.backgrounds : counts.colours, colour);
    }
  }
  if (property === "font-family") bump(counts.fontFamilies, value);
  if (property === "font-size") bump(counts.fontSizes, toPx(value) ?? value);
  if (property === "border-radius") {
    const first = value.split(/\s+/)[0];
    if (first !== "0") bump(counts.radii, toPx(first) ?? first);
  }
  if (property === "box-shadow" && value !== "none") bump(counts.shadows, value);
  if (/^(padding(-\w+)?|gap|row-gap|column-gap)$/.test(property)) {
    for (const token of value.split(/\s+/)) {
      const px = toPx(token);
      if (px) bump(counts.spacing, px);
    }
  }
}

function componentStyles(declarations: CssRule["declarations"]): Record<string, string> {
  const styles: Record<string, string> = {};
  for (const [property, value] of declarations) {
    if (property === "background") {
      const colour = value.match(COLOUR_VALUE)?.[0];
      if (colour) styles["background-color"] = colour;
    } else if ((COMPONENT_PROPERTIES as readonly string[]).includes(property)) {
      styles[property] = value;
    }
  }
  return styles;
}

function roleFor(selector: string): ComponentRole | undefined {
  if (STATE_PSEUDO.test(selector)) return undefined;
  return ROLE_SELECTORS.find(([, pattern]) => pattern.test(selector))?.[0];
}

/**
 * Reads a stylesheet into the shape the bookmarklet captures. It sees the
 * rules, not a rendered page, so counts are how often a value is written
 * rather than how often it is shown, and components are found by selector.
 */
export function captureFromCss(css: string, title = ""): DesignCapture {
  const capture = { ...emptyCapture(), title };
  const rules = parseCssRules(css);

  for (const { selector, declarations } of rules) {
    if (!splitTopLevel(selector, ",").some((part) => ROOT_SELECTOR.test(part))) continue;
    for (const [property, value] of declarations) {
      if (property.startsWith("--")) capture.variables[property.slice(2)] = value;
    }
  }
  for (const [name, value] of Object.entries(capture.variables)) {
    capture.variables[name] = resolveVariables(value, capture.variables);
  }

  for (const { selector, declarations } of rules) {
    const resolved = declarations.map(
      ([property, value]): [string, string] => [property, resolveVariables(value, capture.variables)]
    );
    for (const [property, value] of resolved) countDeclaration(capture.counts, property, value);
    for (const part of splitTopLevel(selector, ",")) {
      const role = roleFor(part);
      if (!role) continue;
      capture.components[role] = { ...capture.components[role], ...componentStyles(resolved) };
    }
  }
  return capture;
}

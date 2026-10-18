import { relativeLuminance } from "@/lib/colour/colour-contrast";
import { parseColour } from "@/lib/colour/colour-format";
import { byUse, designColours, hexInside } from "@/lib/text/design-md/design-colours";
import type {
  ComponentRole,
  DesignCapture,
  DesignToken,
  DesignTokens,
} from "@/lib/text/design-md/types";

const MAX_SPACING = 10;
const MAX_RADII = 6;
const MAX_SHADOWS = 4;
const SIZE_NAMES = ["sm", "md", "lg", "xl", "2xl", "3xl"];

const COMPONENT_NAMES: [ComponentRole, string][] = [
  ["button", "Button"],
  ["button-secondary", "Secondary button"],
  ["link", "Link"],
  ["input", "Input"],
  ["card", "Card"],
  ["badge", "Badge"],
  ["nav", "Navigation"],
  ["code", "Code"],
];

/** Values that say nothing about a component, so are left out of it. */
const NOISE = /^(none|normal|0px|auto|rgba\(0, 0, 0, 0\)|transparent)$/;

const px = (value: string) => Number.parseFloat(value) || 0;

/** A plain `px` or `rem` length in pixels, or undefined for anything relative or computed. */
function absolutePx(value: string | undefined): number | undefined {
  const match = /^(\d*\.?\d+)(px|rem)$/.exec(value?.trim() ?? "");
  if (!match) return undefined;
  return Number(match[1]) * (match[2] === "rem" ? 16 : 1);
}

/** The first few families of a font stack, which is all anyone needs to match it. */
function shortStack(stack: string | undefined): string | undefined {
  if (!stack) return undefined;
  return stack.split(",").map((family) => family.trim()).slice(0, 4).join(", ");
}

/** "Stripe | Financial infrastructure" reads better as "Stripe". */
function siteName(title: string): string {
  return title.split(/\s+[|·\u2013\u2014-]\s+/)[0].trim();
}

function fonts(capture: DesignCapture): DesignToken[] {
  const { components: c, counts } = capture;
  const body = shortStack(c.text?.["font-family"] ?? c.body?.["font-family"]);
  const heading = shortStack(c.h1?.["font-family"]);
  const mono = shortStack(c.code?.["font-family"]);
  const named = [
    { name: "body", value: body },
    { name: "heading", value: heading !== body ? heading : undefined },
    { name: "mono", value: mono },
  ].filter((token): token is DesignToken => Boolean(token.value));
  if (named.length) return named;
  return byUse(counts.fontFamilies)
    .slice(0, 3)
    .map((stack, index) => ({ name: index === 0 ? "body" : `font-${index + 1}`, value: shortStack(stack) ?? stack }));
}

/** `48px / 1.1 / 700`: size, line height as a ratio, then weight. */
function textStyle(styles: Record<string, string>): string | undefined {
  const size = styles["font-size"];
  if (!size) return undefined;
  const lineHeight = styles["line-height"];
  const sizePx = absolutePx(size);
  const lineHeightPx = lineHeight?.endsWith("px") ? absolutePx(lineHeight) : undefined;
  const ratio =
    sizePx && lineHeightPx && Number.isFinite(lineHeightPx / sizePx)
      ? String(Math.round((lineHeightPx / sizePx) * 100) / 100)
      : lineHeight || "normal";
  const tracking = styles["letter-spacing"];
  return [
    [size, ratio, styles["font-weight"] || "400"].join(" / "),
    tracking && !NOISE.test(tracking) ? `tracking ${tracking}` : undefined,
  ].filter(Boolean).join(", ");
}

function typeScale(capture: DesignCapture): DesignToken[] {
  const { components: c, counts } = capture;
  const roles: [string, Record<string, string> | undefined][] = [
    ["h1", c.h1], ["h2", c.h2], ["h3", c.h3], ["body", c.text ?? c.body], ["code", c.code],
  ];
  const named = roles.flatMap(([name, styles]) => {
    const value = styles && textStyle(styles);
    return value ? [{ name, value }] : [];
  });
  if (named.length) return named;
  return byUse(counts.fontSizes)
    .slice(0, 6)
    .sort((a, b) => px(a) - px(b))
    .map((value, index) => ({ name: `text-${index + 1}`, value }));
}

function spacing(capture: DesignCapture): DesignToken[] {
  return byUse(capture.counts.spacing)
    .slice(0, MAX_SPACING)
    .sort((a, b) => px(a) - px(b))
    .map((value, index) => ({ name: `space-${index + 1}`, value }));
}

function radii(capture: DesignCapture): DesignToken[] {
  const values = byUse(capture.counts.radii).slice(0, MAX_RADII);
  const isFull = (value: string) => value.endsWith("%") || px(value) >= 999;
  return [
    ...values.filter((value) => !isFull(value)).sort((a, b) => px(a) - px(b))
      .map((value, index) => ({ name: SIZE_NAMES[index], value })),
    ...values.filter(isFull).slice(0, 1).map((value) => ({ name: "full", value })),
  ];
}

function shadows(capture: DesignCapture): DesignToken[] {
  return byUse(capture.counts.shadows)
    .slice(0, MAX_SHADOWS)
    .map((value, index) => ({ name: `shadow-${index + 1}`, value: hexInside(value) }));
}

function components(capture: DesignCapture): DesignToken[] {
  return COMPONENT_NAMES.flatMap(([role, name]) => {
    const styles = capture.components[role];
    if (!styles) return [];
    const value = Object.entries(styles)
      .filter(([property, raw]) => !NOISE.test(raw) && property !== "font-family")
      .map(([property, raw]) => `${property}: ${hexInside(raw)}`)
      .join("; ");
    return value ? [{ name, value }] : [];
  });
}

function overview(name: string, colours: DesignToken[], fontTokens: DesignToken[]): string {
  const find = (tokenName: string) => colours.find((token) => token.name === tokenName)?.value;
  const background = parseColour(find("background") ?? "");
  const mode = background && relativeLuminance(background) < 0.2 ? "dark" : "light";
  const primary = find("primary");
  const body = fontTokens.find((token) => token.name === "body")?.value.split(",")[0];
  return [
    `${name || "This design"} uses a ${mode} theme`,
    primary ? ` with ${primary} as its primary colour` : "",
    body ? `, set in ${body}` : "",
    ".",
  ].join("");
}

/** Turns a raw capture into named, editable tokens. */
export function toDesignTokens(capture: DesignCapture): DesignTokens {
  const name = siteName(capture.title);
  const colours = designColours(capture);
  const fontTokens = fonts(capture);
  return {
    name,
    source: capture.url,
    overview: colours.length ? overview(name, colours, fontTokens) : "",
    colours,
    fonts: fontTokens,
    typeScale: typeScale(capture),
    spacing: spacing(capture),
    radii: radii(capture),
    shadows: shadows(capture),
    components: components(capture),
  };
}

/** Where the creator starts when nothing has been pasted. */
export const STARTER_TOKENS: DesignTokens = {
  name: "",
  source: "",
  overview: "",
  colours: [
    { name: "background", value: "#ffffff" },
    { name: "foreground", value: "#111827" },
    { name: "primary", value: "#2563eb" },
    { name: "primary-foreground", value: "#ffffff" },
  ],
  fonts: [{ name: "body", value: "system-ui, sans-serif" }],
  typeScale: [
    { name: "h1", value: "36px / 1.2 / 700" },
    { name: "body", value: "16px / 1.5 / 400" },
  ],
  spacing: [4, 8, 16, 24, 32].map((value, index) => ({ name: `space-${index + 1}`, value: `${value}px` })),
  radii: [{ name: "md", value: "8px" }],
  shadows: [],
  components: [],
};

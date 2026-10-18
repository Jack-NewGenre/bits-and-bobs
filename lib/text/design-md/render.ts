import { gradeContrast } from "@/lib/colour/colour-contrast";
import { parseColour } from "@/lib/colour/colour-format";
import { TOKEN_GROUPS, type DesignToken, type DesignTokens } from "@/lib/text/design-md/types";

/** Pairs worth checking, as [text, surface]. */
const CONTRAST_PAIRS: [string, string][] = [
  ["foreground", "background"],
  ["heading", "background"],
  ["link", "background"],
  ["primary-foreground", "primary"],
  ["foreground", "surface"],
];

/** Groups that go in the front matter: everything with a plain value. */
const FRONT_MATTER_GROUPS = TOKEN_GROUPS.filter((group) => group.key !== "components");

const yamlKey = (name: string) => (/^[a-z][\w-]*$/i.test(name) ? name : JSON.stringify(name));
const filled = (tokens: DesignToken[]) =>
  tokens.filter((token) => token.name.trim() && token.value.trim());

function frontMatter(tokens: DesignTokens): string[] {
  const lines = ["---", `name: ${JSON.stringify(tokens.name || "Untitled")}`];
  if (tokens.source) lines.push(`source: ${JSON.stringify(tokens.source)}`);
  for (const { key } of FRONT_MATTER_GROUPS) {
    const group = filled(tokens[key]);
    if (!group.length) continue;
    lines.push(`${key}:`);
    for (const { name, value } of group) {
      lines.push(`  ${yamlKey(name.trim())}: ${JSON.stringify(value.trim())}`);
    }
  }
  return [...lines, "---"];
}

function contrastLines(colours: DesignToken[]): string[] {
  const lookup = new Map(filled(colours).map((token) => [token.name, token.value]));
  return CONTRAST_PAIRS.flatMap(([text, surface]) => {
    const foreground = parseColour(lookup.get(text) ?? "");
    const background = parseColour(lookup.get(surface) ?? "");
    if (!foreground || !background) return [];
    const { ratio, level } = gradeContrast(foreground, background);
    return [`- \`${text}\` on \`${surface}\`: ${ratio.toFixed(2)}:1 (${level})`];
  });
}

/** The base unit, when every spacing value shares one. */
function spacingGrid(spacing: DesignToken[]): number | undefined {
  const values = filled(spacing).map((token) => Number.parseFloat(token.value));
  if (values.length < 3 || values.some(Number.isNaN)) return undefined;
  return [8, 4].find((unit) => values.every((value) => value % unit === 0));
}

const cssName = (prefix: string, name: string) => {
  const clean = name.trim().replace(/^--/, "").replace(/[^\w-]/g, "-");
  return `--${prefix}${clean}`;
};

/** Roles come first in the colour list, so a site variable of the same name never overrides one. */
function themeSnippet(tokens: DesignTokens): string[] {
  const declarations = [
    ...filled(tokens.colours).map(({ name, value }) => [cssName("", name), value]),
    ...filled(tokens.fonts).map(({ name, value }) => [cssName("font-", name), value]),
    ...filled(tokens.radii).map(({ name, value }) => [cssName("radius-", name), value]),
    ...filled(tokens.spacing).map(({ name, value }) => [cssName("", name), value]),
    ...filled(tokens.shadows).map(({ name, value }) => [cssName("", name), value]),
  ].filter(([name], index, all) => all.findIndex(([other]) => other === name) === index);
  if (!declarations.length) return [];
  return [
    "## Theme snippet",
    "",
    "The tokens above as CSS custom properties, ready to adapt.",
    "",
    "```css",
    ":root {",
    ...declarations.map(([name, value]) => `  ${name}: ${value.trim()};`),
    "}",
    "```",
    "",
  ];
}

function componentSections(components: DesignToken[]): string[] {
  const list = filled(components);
  if (!list.length) return [];
  return [
    "## Components",
    "",
    "Styles read from one example of each component on the page.",
    "",
    ...list.flatMap(({ name, value }) => [
      `### ${name.trim()}`,
      "",
      ...value.split(";").map((part) => part.trim()).filter(Boolean).map((part) => `- ${part}`),
      "",
    ]),
  ];
}

/**
 * Writes the tokens as a DESIGN.md for a codebase: machine-readable tokens in
 * the front matter, then the guidance a person or a coding agent needs to
 * build a matching look, then a theme snippet to start from.
 */
export function renderDesignMd(tokens: DesignTokens): string {
  const title = tokens.name.trim() || "Untitled";
  const contrast = contrastLines(tokens.colours);
  const grid = spacingGrid(tokens.spacing);
  const typeScale = filled(tokens.typeScale);

  return [
    ...frontMatter(tokens),
    "",
    `# ${title} design system`,
    "",
    tokens.source
      ? `> Captured from ${tokens.source} with Bits & Bobs. Values are as the page rendered them. The token names are guesses, so rename them to fit your codebase.`
      : "> Written with Bits & Bobs. Rename the tokens to fit your codebase.",
    "",
    ...(tokens.overview.trim() ? ["## Overview", "", tokens.overview.trim(), ""] : []),
    ...(contrast.length ? ["## Colour contrast", "", ...contrast, ""] : []),
    ...(typeScale.length
      ? [
          "## Typography",
          "",
          "Type scale values read as size / line height / weight.",
          "",
          ...typeScale.map(({ name, value }) => `- \`${name.trim()}\`: ${value.trim()}`),
          "",
        ]
      : []),
    ...(grid ? ["## Spacing", "", `Every spacing value is a multiple of ${grid}px.`, ""] : []),
    ...componentSections(tokens.components),
    ...themeSnippet(tokens),
    "## Using this file",
    "",
    "- Map the tokens onto your project's theme (CSS variables, Tailwind `@theme` or equivalent) before building components.",
    "- Build components from the values under Components, with your own markup and component library.",
    "- Keep every text and surface pair at or above the contrast listed here.",
    "- This describes a look. Do not copy the source's logos, images, illustrations or copy.",
    "",
  ].join("\n");
}

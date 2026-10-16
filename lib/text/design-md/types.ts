/** Elements the capture looks for, one sample of each. */
export const COMPONENT_ROLES = [
  "body",
  "h1",
  "h2",
  "h3",
  "text",
  "link",
  "button",
  "button-secondary",
  "input",
  "card",
  "badge",
  "nav",
  "code",
] as const;

export type ComponentRole = (typeof COMPONENT_ROLES)[number];

/** How often each value turned up, keyed by the value. */
export type ValueCounts = Record<string, number>;

/**
 * What the bookmarklet copies, and what pasted CSS or HTML is read into, so
 * both inputs share one normaliser.
 */
export interface DesignCapture {
  kind: "design-md-capture";
  version: 1;
  title: string;
  url: string;
  /** Custom properties, without the leading `--`, as resolved values. */
  variables: Record<string, string>;
  counts: {
    colours: ValueCounts;
    backgrounds: ValueCounts;
    fontFamilies: ValueCounts;
    fontSizes: ValueCounts;
    radii: ValueCounts;
    shadows: ValueCounts;
    spacing: ValueCounts;
  };
  /** CSS property to value, for the first sample of each role found. */
  components: Partial<Record<ComponentRole, Record<string, string>>>;
}

export interface DesignToken {
  name: string;
  value: string;
}

/** The editable token lists, in the order the file presents them. */
export const TOKEN_GROUPS = [
  { key: "colours", label: "Colours", noun: "colour" },
  { key: "fonts", label: "Fonts", noun: "font" },
  { key: "typeScale", label: "Type scale", noun: "text style" },
  { key: "spacing", label: "Spacing", noun: "space" },
  { key: "radii", label: "Radii", noun: "radius" },
  { key: "shadows", label: "Shadows", noun: "shadow" },
  { key: "components", label: "Components", noun: "component" },
] as const;

export type TokenGroupKey = (typeof TOKEN_GROUPS)[number]["key"];

export type DesignTokens = Record<TokenGroupKey, DesignToken[]> & {
  name: string;
  source: string;
  overview: string;
};

/** Properties sampled for each component role. */
export const COMPONENT_PROPERTIES = [
  "background-color",
  "color",
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "letter-spacing",
  "text-transform",
  "padding",
  "border",
  "border-radius",
  "box-shadow",
] as const;

export function emptyCapture(): DesignCapture {
  return {
    kind: "design-md-capture",
    version: 1,
    title: "",
    url: "",
    variables: {},
    counts: {
      colours: {},
      backgrounds: {},
      fontFamilies: {},
      fontSizes: {},
      radii: {},
      shadows: {},
      spacing: {},
    },
    components: {},
  };
}

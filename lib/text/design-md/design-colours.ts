import { formatHex, parseColour } from "@/lib/colour/colour-format";
import { COLOUR_VALUE } from "@/lib/text/design-md/parse-css";
import type { DesignCapture, DesignToken, ValueCounts } from "@/lib/text/design-md/types";

const MAX_COLOURS = 24;

/** shadcn-style themes store bare HSL channels, such as `222 47% 11%`. */
const BARE_HSL = /^-?[\d.]+(deg)?\s+[\d.]+%\s+[\d.]+%(\s*\/\s*[\d.]+%?)?$/;

/** Any CSS colour as hex, or undefined when it is not one or is see-through. */
export function toHex(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  const colour =
    parseColour(trimmed) ?? (BARE_HSL.test(trimmed) ? parseColour(`hsl(${trimmed})`) : undefined);
  return colour && colour.a > 0 ? formatHex(colour) : undefined;
}

/** Rewrites every colour inside a value, such as a border or shadow, as hex. */
export function hexInside(value: string): string {
  return value.replace(COLOUR_VALUE, (match) => toHex(match) ?? match);
}

/** Values ordered from most to least used. */
export function byUse(counts: ValueCounts): string[] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([value]) => value);
}

function borderColour(border: string | undefined): string | undefined {
  if (!border || border === "none") return undefined;
  return toHex(border.match(COLOUR_VALUE)?.[0]);
}

/**
 * Names the colours a page uses. Roles read off the sampled components come
 * first (background, foreground, primary...), then the site's own colour
 * variables, used ones first, then any other colour that is used often.
 */
export function designColours(capture: DesignCapture): DesignToken[] {
  const { components: c, counts, variables } = capture;
  const used = [...byUse(counts.backgrounds), ...byUse(counts.colours)];
  const usedHex = used.map(toHex);
  // Without a body rule, guess from the values no other component claims.
  const unclaimed = (values: ValueCounts, property: string) => {
    const claimed = Object.values(c).map((styles) => toHex(styles?.[property]));
    return byUse(values).map(toHex).find((hex) => hex && !claimed.includes(hex));
  };
  const background =
    toHex(c.body?.["background-color"]) ?? unclaimed(counts.backgrounds, "background-color");
  const foreground =
    toHex(c.body?.color) ?? toHex(c.text?.color) ?? unclaimed(counts.colours, "color");

  const roles: [string, string | undefined][] = [
    ["background", background],
    ["foreground", foreground],
    ["heading", toHex(c.h1?.color)],
    ["primary", toHex(c.button?.["background-color"])],
    ["primary-foreground", c.button?.["background-color"] ? toHex(c.button.color) : undefined],
    ["link", toHex(c.link?.color)],
    ["surface", toHex(c.card?.["background-color"])],
    ["border", borderColour(c.card?.border) ?? borderColour(c.input?.border)],
  ];

  const tokens: DesignToken[] = [];
  const seen = new Set<string>();
  const add = (name: string, value: string | undefined) => {
    if (!value || tokens.length >= MAX_COLOURS) return;
    tokens.push({ name, value });
    seen.add(value);
  };

  for (const [name, value] of roles) {
    // A role that only repeats the background or the text colour says nothing new.
    const repeats = name !== "background" && name !== "foreground" && seen.has(value ?? "");
    if (name.endsWith("-foreground") || !repeats) add(name, value);
  }

  const colourVariables = Object.entries(variables)
    .map(([name, value]): [string, string | undefined] => [name, toHex(value)])
    .filter((entry): entry is [string, string] => entry[1] !== undefined);
  const isUsed = ([, value]: [string, string]) => usedHex.includes(value);

  // Variables keep their own names even when a role already has the value:
  // that is what tells a reader which variable the role maps to.
  for (const [name, value] of colourVariables.filter(isUsed)) add(`--${name}`, value);
  let extra = 1;
  for (const value of usedHex) {
    if (value && !seen.has(value)) add(`colour-${extra++}`, value);
  }
  for (const [name, value] of colourVariables.filter((entry) => !isUsed(entry))) {
    add(`--${name}`, value);
  }
  return tokens;
}

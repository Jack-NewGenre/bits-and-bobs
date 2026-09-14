/**
 * A small, targeted optimiser for imagetracer's SVG output.
 *
 * The tracer emits one `<path>` per traced region, each repeating the same
 * `fill`, `stroke`, `stroke-width` and `opacity` attributes. A colour made of
 * 400 separate shapes becomes 400 elements saying the same thing. Because the
 * tracer walks one palette colour at a time, those siblings are already
 * consecutive, so merging a run of identically-styled paths into a single
 * element is purely a size win: the painting order never changes.
 *
 * On top of that: `rgb(r,g,b)` becomes hex, a redundant `opacity="1"` is
 * dropped, and fully transparent paths are removed outright.
 */

interface ParsedPath {
  /** The style attributes, normalised and ready to re-emit. */
  style: string;
  /** The path geometry. */
  d: string;
  opacity: number;
}

const PATH_PATTERN = /<path\s+([^>]*?)\/>/g;
const ATTR_PATTERN = /([\w-]+)="([^"]*)"/g;
const RGB_PATTERN = /^rgb\((\d+),(\d+),(\d+)\)$/;

/** `rgb(17,34,51)` → `#123`, falling back to the input when it isn't RGB. */
export function toHexColor(value: string): string {
  const match = RGB_PATTERN.exec(value.replace(/\s/g, ""));
  if (!match) return value;

  const [red, green, blue] = match.slice(1).map(Number);
  if ([red, green, blue].some((channel) => channel > 255)) return value;

  const hex = [red, green, blue]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("");
  // #aabbcc collapses to #abc when every channel is a repeated digit.
  return /^(.)\1(.)\2(.)\3$/.test(hex)
    ? `#${hex[0]}${hex[2]}${hex[4]}`
    : `#${hex}`;
}

function parseAttributes(raw: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const [, name, value] of raw.matchAll(ATTR_PATTERN)) {
    attributes[name] = value;
  }
  return attributes;
}

function parsePath(raw: string): ParsedPath | undefined {
  const { d, fill, stroke, opacity, ...rest } = parseAttributes(raw);
  if (!d) return undefined;

  const alpha = opacity === undefined ? 1 : Number(opacity);
  if (alpha === 0) return undefined;

  const parts: string[] = [];
  if (fill) parts.push(`fill="${toHexColor(fill)}"`);
  if (stroke) parts.push(`stroke="${toHexColor(stroke)}"`);
  for (const [name, value] of Object.entries(rest)) {
    parts.push(`${name}="${value}"`);
  }
  // opacity="1" is the default, so it only earns its bytes when it isn't 1.
  if (alpha !== 1) parts.push(`opacity="${alpha}"`);

  return { style: parts.join(" "), d: d.trim().replace(/\s+/g, " "), opacity: alpha };
}

/**
 * Merge consecutive identically-styled paths and tidy the attributes.
 * Returns the SVG unchanged if it contains no `<path>` elements.
 */
export function optimizeSvg(svg: string): string {
  // A run's geometry is collected as pieces and joined once at the end.
  // Appending to a string instead would recopy the whole accumulated `d` on
  // every merge, and a colour trace can produce thousands of merges into a
  // path already megabytes long.
  const merged: { style: string; pieces: string[] }[] = [];
  let start = -1;
  let end = -1;

  // The matches are consumed as they come rather than collected first: the only
  // things needed beyond each path is where the first and last one sit.
  for (const match of svg.matchAll(PATH_PATTERN)) {
    if (start === -1) start = match.index;
    end = match.index + match[0].length;

    const path = parsePath(match[1]);
    if (!path) continue;

    const previous = merged.at(-1);
    if (previous && previous.style === path.style) {
      previous.pieces.push(path.d);
      continue;
    }
    merged.push({ style: path.style, pieces: [path.d] });
  }

  if (start === -1) return svg;

  const body = merged
    .map((path) => `<path ${path.style} d="${path.pieces.join(" ")}"/>`)
    .join("");

  // Splice the rebuilt paths back between the original opening/closing tags.
  return svg.slice(0, start) + body + svg.slice(end);
}

export interface CssRule {
  selector: string;
  declarations: [property: string, value: string][];
}

/** At-rules whose block holds more rules, rather than declarations. */
const GROUPING_AT_RULE = /^@(media|supports|layer|container|scope|document)\b/i;

/**
 * Media blocks that restyle the page for another context. Flattened in, their
 * values would replace the default light, on-screen ones they come after.
 */
const OTHER_CONTEXT_MEDIA =
  /^@media\b.*(prefers-color-scheme\s*:\s*dark|\bprint\b)/i;

/** The index of the brace that closes the one at `open`, skipping strings. */
function closingBrace(css: string, open: number): number {
  let depth = 0;
  let quote = "";
  for (let index = open; index < css.length; index++) {
    const char = css[index];
    if (quote) {
      if (char === "\\") index++;
      else if (char === quote) quote = "";
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === "{") {
      depth++;
    } else if (char === "}" && --depth === 0) {
      return index;
    }
  }
  return css.length;
}

/** Splits on a separator that sits outside brackets and strings. */
export function splitTopLevel(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote = "";
  let start = 0;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quote) {
      if (char === quote) quote = "";
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === "(" || char === "[") {
      depth++;
    } else if (char === ")" || char === "]") {
      depth--;
    } else if (char === separator && depth === 0) {
      parts.push(text.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}

/** Drops nested blocks (CSS nesting) so only the rule's own declarations remain. */
function ownDeclarations(body: string): string {
  let result = "";
  let index = 0;
  while (index < body.length) {
    const open = body.indexOf("{", index);
    if (open === -1) return result + body.slice(index);
    const statementStart = body.lastIndexOf(";", open) + 1;
    result += body.slice(index, Math.max(statementStart, index));
    index = closingBrace(body, open) + 1;
  }
  return result;
}

export function parseDeclarations(body: string): CssRule["declarations"] {
  return splitTopLevel(ownDeclarations(body), ";").flatMap((declaration) => {
    const colon = declaration.indexOf(":");
    if (colon <= 0) return [];
    const property = declaration.slice(0, colon).trim();
    const value = declaration
      .slice(colon + 1)
      .replace(/!important\s*$/i, "")
      .trim();
    if (!value) return [];
    return [
      [property.startsWith("--") ? property : property.toLowerCase(), value],
    ];
  });
}

/**
 * A forgiving read of a stylesheet into flat style rules. Grouping at-rules
 * such as `@media` are opened up and their rules kept; `@font-face`,
 * `@keyframes` and the like are skipped. Malformed input gives fewer rules,
 * never an error.
 */
export function parseCssRules(css: string): CssRule[] {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules: CssRule[] = [];
  let preludeStart = 0;
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    if (char === ";" || char === "}") {
      preludeStart = index + 1;
    } else if (char === "{") {
      const prelude = source.slice(preludeStart, index).trim();
      const close = closingBrace(source, index);
      const body = source.slice(index + 1, close);
      if (GROUPING_AT_RULE.test(prelude)) {
        if (!OTHER_CONTEXT_MEDIA.test(prelude))
          rules.push(...parseCssRules(body));
      } else if (prelude && !prelude.startsWith("@")) {
        rules.push({
          selector: prelude,
          declarations: parseDeclarations(body),
        });
      }
      index = close;
      preludeStart = close + 1;
    }
    index++;
  }
  return rules;
}

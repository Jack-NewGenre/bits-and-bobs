/**
 * JSON formatting, minifying and error reporting.
 *
 * `JSON.parse` throws a message that names a character offset and nothing
 * else, as "position 431" is no help in a 400-line document. The offset is
 * turned back into a line and column here, along with the offending line
 * itself, so the error points at somewhere you can actually look.
 */

export type JsonMode = "format" | "minify";

export const INDENT_OPTIONS = [2, 4] as const;
export type Indent = (typeof INDENT_OPTIONS)[number] | "tab";

export interface JsonError {
  message: string;
  /** 1-based, when the position could be recovered from the parser. */
  line?: number;
  column?: number;
  /** The source line the error falls on, for context. */
  excerpt?: string;
}

export interface JsonResult {
  ok: boolean;
  value: string;
  error?: JsonError;
  /** Rough shape of a successful parse, for the summary line. */
  stats?: JsonStats;
  /** Number literals the round trip through JavaScript could not preserve. */
  lossyNumbers?: string[];
}

export interface JsonStats {
  keys: number;
  /** How deeply objects and arrays nest. */
  depth: number;
  /** Total array items across the document. */
  items: number;
}

/** Turn a character offset into a 1-based line and column. */
export function locate(
  text: string,
  offset: number,
): { line: number; column: number; excerpt: string } {
  const safe = Math.max(0, Math.min(offset, text.length));
  const before = text.slice(0, safe);
  const lines = before.split("\n");
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;
  const excerpt = text.split("\n")[line - 1] ?? "";
  return { line, column, excerpt };
}

/** Pull the character offset out of a `SyntaxError`, where it has one. */
export function offsetFromMessage(message: string): number | undefined {
  const position = /at position (\d+)/i.exec(message);
  return position ? Number(position[1]) : undefined;
}

/** Some engines report only a line and column, with no character offset. */
export function lineColumnFromMessage(
  message: string,
): { line: number; column: number } | undefined {
  const found = /line (\d+) column (\d+)/i.exec(message);
  return found
    ? { line: Number(found[1]), column: Number(found[2]) }
    : undefined;
}

/**
 * Strip the parser's own position wording, which the UI renders separately
 * and more legibly. Leaves the message alone if there is nothing to trim, so
 * no detail is lost.
 */
export function trimPosition(message: string): string {
  return message
    .replace(/\s*\(line \d+ column \d+\)\s*$/i, "")
    .replace(/\s*at position \d+\s*$/i, "")
    .replace(/\s*at line \d+ column \d+\s*$/i, "")
    .trim();
}

function describe(error: unknown, text: string): JsonError {
  const raw = error instanceof Error ? error.message : "Invalid JSON";

  const offset = offsetFromMessage(raw);
  if (offset !== undefined) {
    const { line, column, excerpt } = locate(text, offset);
    return { message: trimPosition(raw), line, column, excerpt };
  }

  const direct = lineColumnFromMessage(raw);
  if (direct) {
    return {
      message: trimPosition(raw),
      ...direct,
      excerpt: text.split("\n")[direct.line - 1] ?? "",
    };
  }

  return { message: raw };
}

/** Number literals, ignoring anything inside a string. */
const NUMBER_PATTERN = /"(?:\\.|[^"\\])*"|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

/**
 * Find numbers JavaScript cannot represent faithfully.
 *
 * `JSON.parse` turns every number into a float64, so a 19-digit ID comes back
 * rounded and `1e400` comes back as `Infinity`, which `JSON.stringify` then
 * writes as `null`. Both change the data silently, which for something like a
 * Twitter or Discord snowflake ID means the formatter hands back a document
 * that no longer refers to the same thing.
 */
export function findLossyNumbers(text: string): string[] {
  const lossy = new Set<string>();

  for (const match of text.matchAll(NUMBER_PATTERN)) {
    const literal = match[1];
    if (literal === undefined) continue;

    const value = Number(literal);
    const isInteger = !/[.eE]/.test(literal);

    if (!Number.isFinite(value) || (isInteger && !Number.isSafeInteger(value))) {
      lossy.add(literal);
    }
  }

  return [...lossy];
}

/** Count keys, depth and array items in a parsed value. */
export function summarise(value: unknown): JsonStats {
  let keys = 0;
  let items = 0;
  let depth = 0;

  // Only containers count towards depth: a string inside an object is not a
  // fourth level of nesting, it is the contents of the third.
  const walk = (node: unknown, level: number) => {
    const isContainer = Array.isArray(node) || (node !== null && typeof node === "object");
    if (isContainer && level > depth) depth = level;

    if (Array.isArray(node)) {
      items += node.length;
      node.forEach((entry) => walk(entry, level + 1));
      return;
    }
    if (node !== null && typeof node === "object") {
      const entries = Object.entries(node as Record<string, unknown>);
      keys += entries.length;
      entries.forEach(([, entry]) => walk(entry, level + 1));
    }
  };

  walk(value, value !== null && typeof value === "object" ? 1 : 0);
  return { keys, depth, items };
}

/** Sort every object's keys, recursively, leaving array order alone. */
export function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value === null || typeof value !== "object") return value;

  const entries = Object.entries(value as Record<string, unknown>);
  entries.sort(([first], [second]) => first.localeCompare(second));
  return Object.fromEntries(
    entries.map(([key, entry]) => [key, sortKeys(entry)]),
  );
}

export interface JsonOptions {
  mode: JsonMode;
  indent: Indent;
  /** Alphabetise object keys, which makes two documents comparable. */
  sort: boolean;
}

export const DEFAULT_JSON_OPTIONS: JsonOptions = {
  mode: "format",
  indent: 2,
  sort: false,
};

export function processJson(text: string, options: JsonOptions): JsonResult {
  if (text.trim() === "") return { ok: true, value: "" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return { ok: false, value: "", error: describe(error, text) };
  }

  const prepared = options.sort ? sortKeys(parsed) : parsed;
  const spacer =
    options.mode === "minify" ? undefined : options.indent === "tab" ? "\t" : options.indent;

  const lossyNumbers = findLossyNumbers(text);

  return {
    ok: true,
    value: JSON.stringify(prepared, null, spacer),
    stats: summarise(parsed),
    lossyNumbers: lossyNumbers.length > 0 ? lossyNumbers : undefined,
  };
}

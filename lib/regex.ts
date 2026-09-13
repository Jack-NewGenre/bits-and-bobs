/**
 * Regular-expression testing.
 *
 * Two things make this safe to run on every keystroke. A pattern the user is
 * mid-way through typing is usually invalid, so a bad pattern is reported
 * rather than thrown. And a global pattern that can match empty (`a*` on a
 * long string) would otherwise loop forever, so matching is bounded and the
 * cursor is always advanced.
 */

export const FLAGS = [
  { value: "g", label: "g", title: "Global: find every match, not just the first" },
  { value: "i", label: "i", title: "Ignore case" },
  { value: "m", label: "m", title: "Multiline: ^ and $ match at line breaks" },
  { value: "s", label: "s", title: "Dot matches newlines too" },
  { value: "u", label: "u", title: "Unicode-aware escapes" },
] as const;

export type Flag = (typeof FLAGS)[number]["value"];

/** Hard cap on matches, so a runaway pattern cannot hang the page. */
export const MAX_MATCHES = 500;

export interface RegexGroup {
  /** The capture's name, or its number as a string. */
  name: string;
  value?: string;
}

export interface RegexMatch {
  text: string;
  index: number;
  groups: RegexGroup[];
}

export interface RegexResult {
  ok: boolean;
  matches: RegexMatch[];
  error?: string;
  /** True when the cap was reached and matching stopped early. */
  truncated: boolean;
}

function toGroups(match: RegExpExecArray): RegexGroup[] {
  const named = Object.entries(match.groups ?? {}).map(([name, value]) => ({
    name,
    value,
  }));

  const numbered = match
    .slice(1)
    .map((value, index) => ({ name: String(index + 1), value }));

  return named.length > 0 ? named : numbered;
}

/** Build a RegExp, reporting a bad pattern instead of throwing. */
export function compile(
  pattern: string,
  flags: string,
): { regex?: RegExp; error?: string } {
  try {
    return { regex: new RegExp(pattern, flags) };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Invalid pattern",
    };
  }
}

/** Run a pattern over some text and collect every match. */
export function runRegex(
  pattern: string,
  flags: string,
  input: string,
): RegexResult {
  if (pattern === "") return { ok: true, matches: [], truncated: false };

  const { regex, error } = compile(pattern, flags);
  if (!regex) return { ok: false, matches: [], error, truncated: false };

  const matches: RegexMatch[] = [];

  if (!flags.includes("g")) {
    const found = regex.exec(input);
    if (found) {
      matches.push({
        text: found[0],
        index: found.index,
        groups: toGroups(found),
      });
    }
    return { ok: true, matches, truncated: false };
  }

  let found = regex.exec(input);
  while (found !== null && matches.length < MAX_MATCHES) {
    matches.push({ text: found[0], index: found.index, groups: toGroups(found) });
    // A pattern that can match nothing would never move the cursor on its
    // own, so it is nudged forward by hand.
    if (found[0] === "") regex.lastIndex += 1;
    found = regex.exec(input);
  }

  return { ok: true, matches, truncated: found !== null };
}

export interface Segment {
  text: string;
  isMatch: boolean;
}

/** Split the input into alternating plain and matched runs, for highlighting. */
export function toSegments(input: string, matches: RegexMatch[]): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;

  // Empty matches leave gaps that would otherwise split one run of plain text
  // into several, so runs of the same kind are merged as they are added.
  const push = (text: string, isMatch: boolean) => {
    if (text === "") return;
    const last = segments.at(-1);
    if (last && last.isMatch === isMatch) last.text += text;
    else segments.push({ text, isMatch });
  };

  for (const match of matches) {
    if (match.index < cursor) continue; // overlapping, already covered
    push(input.slice(cursor, match.index), false);
    push(match.text, true);
    cursor = match.index + match.text.length;
  }

  push(input.slice(cursor), false);

  return segments;
}

export interface ReplaceResult {
  ok: boolean;
  value: string;
  error?: string;
}

/** Apply a match's captures to a replacement template, e.g. `$1-$2`. */
export function replaceAll(
  pattern: string,
  flags: string,
  input: string,
  replacement: string,
): ReplaceResult {
  const { regex, error } = compile(pattern, flags);
  if (!regex) return { ok: false, value: "", error };

  try {
    return { ok: true, value: input.replace(regex, replacement) };
  } catch (failure) {
    return {
      ok: false,
      value: "",
      error: failure instanceof Error ? failure.message : "Replace failed",
    };
  }
}

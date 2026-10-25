/**
 * Converting text between naming conventions.
 *
 * Every case is built from the same list of words, so `XMLHttpRequest`,
 * `xml_http_request` and `XML http request` all convert the same way. Each
 * line is converted on its own, so a pasted list of names stays a list.
 */

export const CASES = [
  { id: "camel", label: "camelCase" },
  { id: "pascal", label: "PascalCase" },
  { id: "snake", label: "snake_case" },
  { id: "constant", label: "CONSTANT_CASE" },
  { id: "kebab", label: "kebab-case" },
  { id: "dot", label: "dot.case" },
  { id: "title", label: "Title Case" },
  { id: "sentence", label: "Sentence case" },
  { id: "lower", label: "lower case" },
  { id: "upper", label: "UPPER CASE" },
] as const;

export type CaseId = (typeof CASES)[number]["id"];

/**
 * In order: an acronym before a capitalised word (the `XML` in `XMLHttp`), a
 * capitalised or lower-case word with any trailing digits (`v2`), an all-caps
 * run (`HTML5`), a bare number, and scripts without case (`日本語`).
 */
const WORD =
  /\p{Lu}+(?=\p{Lu}\p{Ll})|\p{Lu}?\p{Ll}+\p{N}*|\p{Lu}+\p{N}*|\p{N}+|[\p{Lo}\p{Lt}\p{Lm}]+/gu;

/** An apostrophe inside a word is dropped, so `don't` stays one word. */
const INNER_APOSTROPHE = /(\p{L})['’](\p{L})/gu;

export function splitWords(text: string): string[] {
  return text.replace(INNER_APOSTROPHE, "$1$2").match(WORD) ?? [];
}

const lower = (word: string) => word.toLowerCase();
const upper = (word: string) => word.toUpperCase();

function capitalise(word: string): string {
  const [first = "", ...rest] = word;
  return first.toUpperCase() + rest.join("").toLowerCase();
}

const FORMATTERS: Record<CaseId, (words: string[]) => string> = {
  camel: (words) => words.map((word, i) => (i === 0 ? lower(word) : capitalise(word))).join(""),
  pascal: (words) => words.map(capitalise).join(""),
  snake: (words) => words.map(lower).join("_"),
  constant: (words) => words.map(upper).join("_"),
  kebab: (words) => words.map(lower).join("-"),
  dot: (words) => words.map(lower).join("."),
  title: (words) => words.map(capitalise).join(" "),
  sentence: (words) => capitalise(words.map(lower).join(" ")),
  lower: (words) => words.map(lower).join(" "),
  upper: (words) => words.map(upper).join(" "),
};

export function convertCase(text: string, id: CaseId): string {
  return text
    .split(/\r?\n/)
    .map((line) => FORMATTERS[id](splitWords(line)))
    .join("\n");
}

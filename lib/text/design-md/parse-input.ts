import { captureFromCss } from "@/lib/text/design-md/parse-css";
import {
  COMPONENT_ROLES,
  emptyCapture,
  type DesignCapture,
  type ValueCounts,
} from "@/lib/text/design-md/types";

export type DesignInputKind = "empty" | "capture" | "html" | "css";

export interface DesignInput {
  kind: DesignInputKind;
  capture: DesignCapture;
  /** Stylesheets an HTML file links to, which cannot be read from the paste. */
  linkedStylesheets: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pick<T>(value: unknown, accept: (entry: unknown) => entry is T): Record<string, T> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, T] => accept(entry[1]))
  );
}

const isString = (value: unknown): value is string => typeof value === "string";
const isCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

/**
 * Pasted JSON is untrusted, so every field is checked and anything of the
 * wrong type dropped, rather than trusting that it came from the bookmarklet.
 */
function sanitiseCapture(raw: Record<string, unknown>): DesignCapture {
  const base = emptyCapture();
  const counts = isRecord(raw.counts) ? raw.counts : {};
  const components = isRecord(raw.components) ? raw.components : {};
  return {
    ...base,
    title: isString(raw.title) ? raw.title : "",
    url: isString(raw.url) ? raw.url : "",
    variables: pick(raw.variables, isString),
    counts: Object.fromEntries(
      Object.keys(base.counts).map((key) => [key, pick<number>(counts[key], isCount)])
    ) as Record<keyof DesignCapture["counts"], ValueCounts>,
    components: Object.fromEntries(
      COMPONENT_ROLES.filter((role) => isRecord(components[role])).map((role) => [
        role,
        pick(components[role], isString),
      ])
    ),
  };
}

function readJson(text: string): DesignCapture | undefined {
  try {
    const parsed: unknown = JSON.parse(text);
    return isRecord(parsed) && parsed.kind === "design-md-capture"
      ? sanitiseCapture(parsed)
      : undefined;
  } catch {
    return undefined;
  }
}

function readHtml(text: string): DesignInput {
  const doc = new DOMParser().parseFromString(text, "text/html");
  const sheets = Array.from(doc.querySelectorAll("style"), (style) => style.textContent ?? "");
  const inline = Array.from(
    doc.querySelectorAll("[style]"),
    (el) => `${el.tagName.toLowerCase()} { ${el.getAttribute("style")} }`
  );
  return {
    kind: "html",
    capture: captureFromCss([...sheets, ...inline].join("\n"), doc.title.trim()),
    linkedStylesheets: doc.querySelectorAll('link[rel~="stylesheet"]').length,
  };
}

/** Works out what was pasted (a capture, an HTML page or CSS) and reads it. */
export function readDesignInput(text: string): DesignInput {
  const trimmed = text.trim();
  if (!trimmed) return { kind: "empty", capture: emptyCapture(), linkedStylesheets: 0 };
  if (trimmed.startsWith("{")) {
    const capture = readJson(trimmed);
    if (capture) return { kind: "capture", capture, linkedStylesheets: 0 };
  }
  if (trimmed.startsWith("<")) return readHtml(trimmed);
  return { kind: "css", capture: captureFromCss(trimmed), linkedStylesheets: 0 };
}

/** Typefaces and text settings for text layers. */

export const DEFAULT_FONT = "Inter, system-ui, sans-serif";

/** Fonts every browser can draw without a download, so nothing leaves the machine. */
export const FONT_FAMILIES: readonly { label: string; value: string }[] = [
  { label: "Sans serif", value: DEFAULT_FONT },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Monospace", value: "ui-monospace, Menlo, Consolas, monospace" },
  {
    label: "Rounded",
    value: "ui-rounded, 'Arial Rounded MT Bold', system-ui, sans-serif",
  },
  {
    label: "Condensed",
    value: "'Arial Narrow', 'Helvetica Neue', Arial, sans-serif",
  },
  {
    label: "Impact",
    value: "Impact, Haettenschweiler, 'Arial Black', sans-serif",
  },
  {
    label: "Handwriting",
    value: "'Bradley Hand', 'Segoe Print', 'Comic Sans MS', cursive",
  },
];

export type TextAlign = "left" | "center" | "right" | "justify";

export const TEXT_ALIGNS: readonly TextAlign[] = [
  "left",
  "center",
  "right",
  "justify",
];

/** The label for a font stack, or the first family named in it. */
export function fontLabel(value: string): string {
  return (
    FONT_FAMILIES.find((font) => font.value === value)?.label ??
    value.split(",")[0].replace(/['"]/g, "").trim()
  );
}

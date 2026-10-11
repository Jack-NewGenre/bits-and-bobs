/** Tools and the keyboard shortcuts that drive the editor. */

export type EditorTool =
  | "select"
  | "hand"
  | "marquee"
  | "lasso"
  | "wand"
  | "crop"
  | "eyedropper"
  | "brush"
  | "eraser"
  | "fill"
  | "gradient"
  | "clone"
  | "heal"
  | "tone"
  | "text"
  | "shape";

export const TOOL_KEYS: Record<EditorTool, string> = {
  select: "V",
  hand: "H",
  marquee: "M",
  lasso: "L",
  wand: "W",
  crop: "C",
  eyedropper: "I",
  brush: "B",
  eraser: "E",
  fill: "K",
  gradient: "G",
  clone: "S",
  heal: "J",
  tone: "O",
  text: "T",
  shape: "U",
};

/** Tools that paint pixels into the selected layer with a brush. */
export const BRUSH_TOOLS: ReadonlySet<EditorTool> = new Set([
  "brush",
  "eraser",
  "clone",
  "heal",
  "tone",
]);

/** Brush tools that copy pixels from an Alt-clicked source. */
export const STAMP_TOOLS: ReadonlySet<EditorTool> = new Set(["clone", "heal"]);

/** Tools that drag out a selection rather than draw. */
export const SELECTION_TOOLS: ReadonlySet<EditorTool> = new Set([
  "marquee",
  "lasso",
  "wand",
]);

export type EditorAction =
  | { type: "tool"; tool: EditorTool }
  | { type: "tool-variant"; tool: EditorTool }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "delete" }
  | { type: "duplicate" }
  | { type: "select-all" }
  | { type: "select-all-layers" }
  | { type: "invert-selection" }
  | { type: "deselect" }
  | { type: "reselect" }
  | { type: "save" }
  | { type: "open" }
  | { type: "zoom-in" }
  | { type: "zoom-out" }
  | { type: "zoom-fit" }
  | { type: "zoom-actual" }
  | { type: "brush-size"; delta: 1 | -1 }
  | { type: "brush-hardness"; delta: 1 | -1 }
  | { type: "opacity"; value: number }
  | { type: "default-colours" }
  | { type: "swap-colours" }
  | { type: "fill"; colour: "primary" | "secondary" }
  | { type: "clipping-mask" }
  | { type: "smart-guides" }
  | { type: "select-layer"; direction: "above" | "below" }
  | { type: "nudge"; dx: number; dy: number }
  | { type: "arrange"; direction: "forward" | "backward" | "front" | "back" };

/** The parts of a KeyboardEvent the resolver reads, so tests need no DOM. */
export interface ShortcutKey {
  key: string;
  code?: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

const TOOL_BY_KEY = Object.fromEntries(
  Object.entries(TOOL_KEYS).map(([tool, key]) => [key.toLowerCase(), tool]),
) as Record<string, EditorTool>;

/** Tools whose Shift + letter flips between their two kinds, as Photoshop cycles a tool group. */
const VARIANT_TOOLS: ReadonlySet<EditorTool> = new Set([
  "marquee",
  "lasso",
  "tone",
]);

const NUDGE: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

const CODE_KEYS: Record<string, string> = {
  BracketLeft: "[",
  BracketRight: "]",
  Semicolon: ";",
  Equal: "=",
  Minus: "-",
};

/**
 * The key as printed on an unshifted key cap. Shift and, on a Mac, Option
 * change `key` ("{" for Shift+[, "å" for Option+A), so those fall back to the
 * physical key.
 */
export function baseKey({ key, code = "" }: ShortcutKey): string {
  if (/^[a-z0-9[\];=+-]$/i.test(key)) return key.toLowerCase();
  const letter = /^(?:Key|Digit)(\w)$/.exec(code);
  return letter ? letter[1].toLowerCase() : (CODE_KEYS[code] ?? key);
}

function resolveModified(event: ShortcutKey, key: string): EditorAction | null {
  const { shiftKey: shift, altKey: alt } = event;
  if (key === "Backspace" || key === "Delete")
    return { type: "fill", colour: "secondary" };
  if (key === "z") return { type: shift ? "redo" : "undo" };
  if (key === "y") return { type: "redo" };
  if (key === "d") return { type: shift ? "reselect" : "deselect" };
  if (key === "i" && shift) return { type: "invert-selection" };
  if (key === "a") return { type: alt ? "select-all-layers" : "select-all" };
  if (key === "j") return { type: "duplicate" };
  if (key === "g" && alt) return { type: "clipping-mask" };
  if (key === ";" && shift) return { type: "smart-guides" };
  if (key === "s") return { type: "save" };
  if (key === "o") return { type: "open" };
  if (key === "=" || key === "+") return { type: "zoom-in" };
  if (key === "-") return { type: "zoom-out" };
  if (key === "0") return { type: "zoom-fit" };
  if (key === "1") return { type: "zoom-actual" };
  if (key === "]")
    return { type: "arrange", direction: shift ? "front" : "forward" };
  if (key === "[")
    return { type: "arrange", direction: shift ? "back" : "backward" };
  return null;
}

function resolveAlt(key: string): EditorAction | null {
  if (key === "Backspace" || key === "Delete")
    return { type: "fill", colour: "primary" };
  if (key === "]") return { type: "select-layer", direction: "above" };
  if (key === "[") return { type: "select-layer", direction: "below" };
  return null;
}

/** Maps a key press to an editor action, following Photoshop's shortcuts. */
export function resolveShortcut(event: ShortcutKey): EditorAction | null {
  const key = baseKey(event);
  if (event.metaKey || event.ctrlKey) return resolveModified(event, key);
  if (event.altKey) return resolveAlt(key);

  const nudge = NUDGE[event.key];
  if (nudge) {
    const step = event.shiftKey ? 10 : 1;
    return { type: "nudge", dx: nudge[0] * step, dy: nudge[1] * step };
  }
  if (key === "Delete" || key === "Backspace") return { type: "delete" };
  if (key === "Escape") return { type: "deselect" };
  if (key === "[" || key === "]") {
    const delta = key === "]" ? 1 : -1;
    return { type: event.shiftKey ? "brush-hardness" : "brush-size", delta };
  }
  if (event.shiftKey) {
    const tool = TOOL_BY_KEY[key];
    return tool && VARIANT_TOOLS.has(tool)
      ? { type: "tool-variant", tool }
      : null;
  }
  if (/^\d$/.test(key))
    return { type: "opacity", value: Number(key) * 10 || 100 };
  if (key === "d") return { type: "default-colours" };
  if (key === "x") return { type: "swap-colours" };
  const tool = TOOL_BY_KEY[key];
  return tool ? { type: "tool", tool } : null;
}

/** Controls that use keys themselves: a slider's arrows, a menu, a dialog. */
const KEY_OWNERS =
  '[role="slider"], [role="menu"], [role="listbox"], [role="dialog"]';

/**
 * True when the key press belongs to a control rather than the editor: a text
 * field (including Fabric's hidden one while text is edited), or anything
 * that handles keys itself.
 */
export function handlesOwnKeys(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.closest(KEY_OWNERS) !== null
  );
}

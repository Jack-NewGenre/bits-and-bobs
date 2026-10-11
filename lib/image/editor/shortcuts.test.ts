import { describe, expect, it } from "vitest";

import {
  handlesOwnKeys,
  resolveShortcut,
  type ShortcutKey,
} from "@/lib/image/editor/shortcuts";

const key = (
  value: string,
  modifiers: Partial<ShortcutKey> = {},
): ShortcutKey => ({
  key: value,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...modifiers,
});

describe("editor shortcuts", () => {
  it("picks tools by letter, either case", () => {
    expect(resolveShortcut(key("b"))).toEqual({ type: "tool", tool: "brush" });
    expect(resolveShortcut(key("V"))).toEqual({ type: "tool", tool: "select" });
    expect(resolveShortcut(key("q"))).toBeNull();
  });

  it("uses Photoshop's letters for the selection and painting tools", () => {
    const tools = {
      m: "marquee",
      l: "lasso",
      w: "wand",
      c: "crop",
      i: "eyedropper",
      k: "fill",
      g: "gradient",
      s: "clone",
      o: "tone",
      u: "shape",
    };
    for (const [letter, tool] of Object.entries(tools)) {
      expect(resolveShortcut(key(letter))).toEqual({ type: "tool", tool });
    }
  });

  it("saves, opens and inverts the selection", () => {
    expect(resolveShortcut(key("s", { metaKey: true }))).toEqual({
      type: "save",
    });
    expect(resolveShortcut(key("o", { ctrlKey: true }))).toEqual({
      type: "open",
    });
    expect(
      resolveShortcut(key("I", { metaKey: true, shiftKey: true })),
    ).toEqual({
      type: "invert-selection",
    });
  });

  it("maps undo and redo on both platforms", () => {
    expect(resolveShortcut(key("z", { metaKey: true }))).toEqual({
      type: "undo",
    });
    expect(
      resolveShortcut(key("z", { ctrlKey: true, shiftKey: true })),
    ).toEqual({ type: "redo" });
    expect(resolveShortcut(key("y", { ctrlKey: true }))).toEqual({
      type: "redo",
    });
  });

  it("nudges by one pixel, or ten with shift", () => {
    expect(resolveShortcut(key("ArrowLeft"))).toEqual({
      type: "nudge",
      dx: -1,
      dy: 0,
    });
    expect(resolveShortcut(key("ArrowDown", { shiftKey: true }))).toEqual({
      type: "nudge",
      dx: 0,
      dy: 10,
    });
  });

  it("uses brackets for brush size, and with a modifier for layer order", () => {
    expect(resolveShortcut(key("]"))).toEqual({ type: "brush-size", delta: 1 });
    expect(resolveShortcut(key("[", { metaKey: true }))).toEqual({
      type: "arrange",
      direction: "backward",
    });
  });

  it("deselects, reselects and duplicates as Photoshop does", () => {
    expect(resolveShortcut(key("d", { metaKey: true }))).toEqual({
      type: "deselect",
    });
    expect(
      resolveShortcut(key("D", { metaKey: true, shiftKey: true })),
    ).toEqual({
      type: "reselect",
    });
    expect(resolveShortcut(key("j", { ctrlKey: true }))).toEqual({
      type: "duplicate",
    });
  });

  it("selects all pixels, or all layers with Alt", () => {
    expect(resolveShortcut(key("a", { metaKey: true }))).toEqual({
      type: "select-all",
    });
    expect(
      resolveShortcut(key("å", { code: "KeyA", metaKey: true, altKey: true })),
    ).toEqual({
      type: "select-all-layers",
    });
  });

  it("reads the physical key when Option or Shift changes the character", () => {
    expect(
      resolveShortcut(key("©", { code: "KeyG", metaKey: true, altKey: true })),
    ).toEqual({
      type: "clipping-mask",
    });
    expect(
      resolveShortcut(key("‘", { code: "BracketRight", altKey: true })),
    ).toEqual({
      type: "select-layer",
      direction: "above",
    });
    expect(
      resolveShortcut(key("}", { code: "BracketRight", shiftKey: true })),
    ).toEqual({
      type: "brush-hardness",
      delta: 1,
    });
    expect(
      resolveShortcut(
        key("{", { code: "BracketLeft", metaKey: true, shiftKey: true }),
      ),
    ).toEqual({ type: "arrange", direction: "back" });
  });

  it("fills with the first colour on Alt+Backspace and the second on Cmd+Backspace", () => {
    expect(resolveShortcut(key("Backspace", { altKey: true }))).toEqual({
      type: "fill",
      colour: "primary",
    });
    expect(resolveShortcut(key("Backspace", { metaKey: true }))).toEqual({
      type: "fill",
      colour: "secondary",
    });
  });

  it("sets opacity from the number keys, with 0 as 100%", () => {
    expect(resolveShortcut(key("5"))).toEqual({ type: "opacity", value: 50 });
    expect(resolveShortcut(key("0"))).toEqual({ type: "opacity", value: 100 });
  });

  it("resets and swaps colours with D and X", () => {
    expect(resolveShortcut(key("d"))).toEqual({ type: "default-colours" });
    expect(resolveShortcut(key("x"))).toEqual({ type: "swap-colours" });
  });

  it("switches a tool's kind with Shift and its letter", () => {
    expect(resolveShortcut(key("M", { shiftKey: true }))).toEqual({
      type: "tool-variant",
      tool: "marquee",
    });
    expect(resolveShortcut(key("B", { shiftKey: true }))).toBeNull();
  });

  it("does not treat a modified letter as a tool", () => {
    expect(resolveShortcut(key("b", { metaKey: true }))).toBeNull();
    expect(resolveShortcut(key("b", { altKey: true }))).toBeNull();
  });

  it("leaves keys to sliders, menus and dialogs", () => {
    const slider = document.createElement("span");
    slider.setAttribute("role", "slider");
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    const button = document.createElement("button");
    dialog.appendChild(button);
    expect(handlesOwnKeys(slider)).toBe(true);
    expect(handlesOwnKeys(button)).toBe(true);
    expect(handlesOwnKeys(document.createElement("button"))).toBe(false);
  });

  it("recognises text fields", () => {
    expect(handlesOwnKeys(document.createElement("input"))).toBe(true);
    expect(handlesOwnKeys(document.createElement("textarea"))).toBe(true);
    expect(handlesOwnKeys(document.createElement("div"))).toBe(false);
    expect(handlesOwnKeys(null)).toBe(false);
  });
});

"use client";

import { useEffect, useRef } from "react";

import {
  handlesOwnKeys,
  resolveShortcut,
  type EditorAction,
} from "@/lib/image/editor/shortcuts";

/**
 * Listens for the editor's shortcuts while it is on screen. Key presses in a
 * text field (including Fabric's own hidden one while text is being edited)
 * are left alone.
 */
export function useEditorShortcuts(
  enabled: boolean,
  onAction: (action: EditorAction) => void,
) {
  const handler = useRef(onAction);

  useEffect(() => {
    handler.current = onAction;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat && !event.key.startsWith("Arrow")) return;
      if (handlesOwnKeys(event.target)) return;
      const action = resolveShortcut(event);
      if (!action) return;
      event.preventDefault();
      handler.current(action);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}

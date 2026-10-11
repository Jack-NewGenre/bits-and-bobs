"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const isApple = () => /Mac|iPhone|iPad/.test(navigator.userAgent);

/**
 * The label for the platform's shortcut key: "⌘" on Apple devices, "Ctrl "
 * elsewhere. Empty on the server, so a hint only renders once it is right.
 */
export function useModifierKey(): string {
  return useSyncExternalStore(
    subscribe,
    () => (isApple() ? "⌘" : "Ctrl "),
    () => ""
  );
}

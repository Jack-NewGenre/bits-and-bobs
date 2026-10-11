"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Whether the command menu is open. Kept in a tiny module store rather than a
 * context, so the header button and the menu itself share it without a provider.
 */
let open = false;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getOpen = () => open;
const getServerOpen = () => false;

export function setCommandMenuOpen(next: boolean | ((current: boolean) => boolean)) {
  const value = typeof next === "function" ? next(open) : next;
  if (value === open) return;
  open = value;
  listeners.forEach((listener) => listener());
}

/**
 * The open state, plus ⌘K or Ctrl+K anywhere on the page to toggle it. Call it
 * once, in the menu itself: anything else that opens the menu calls
 * `setCommandMenuOpen` directly.
 */
export function useCommandMenu() {
  const isOpen = useSyncExternalStore(subscribe, getOpen, getServerOpen);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      setCommandMenuOpen((current) => !current);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return [isOpen, setCommandMenuOpen] as const;
}

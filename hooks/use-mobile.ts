"use client";

import { useSyncExternalStore } from "react";

const MOBILE_BREAKPOINT = 768;
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

let query: MediaQueryList | undefined;

/** Created once, lazily, so nothing touches `window` during server rendering. */
function mediaQuery(): MediaQueryList {
  return (query ??= window.matchMedia(QUERY));
}

function subscribe(onChange: () => void): () => void {
  const mql = mediaQuery();
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/**
 * Whether the viewport is narrow enough to count as mobile.
 *
 * `useSyncExternalStore` rather than state filled in by an effect: the sidebar
 * puts this in a context wrapping the whole page, so a value that starts wrong
 * and corrects itself after mount re-renders the entire app once on every
 * visit. Reading `matches` also avoids the layout read `innerWidth` forces.
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => mediaQuery().matches,
    () => false,
  );
}

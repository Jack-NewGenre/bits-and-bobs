"use client";

import { useEffect, useState } from "react";

/** Long enough to skip the keystrokes in a burst, short enough to feel live. */
const DEFAULT_DELAY_MS = 150;

/**
 * The value as it settles, rather than as it changes.
 *
 * Typing into a large document re-runs whatever consumes it on every
 * keystroke. Holding the value back until the user pauses turns a burst of
 * twenty passes into one, without the caller having to manage a timer.
 */
export function useDebounced<T>(value: T, delayMs = DEFAULT_DELAY_MS): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
}

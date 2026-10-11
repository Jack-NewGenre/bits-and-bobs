"use client";

import { useEffect, useState } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";

export const TYPE_MS = 55;
export const HOLD_MS = 1600;

/**
 * Types each line out a character at a time, holds it, then moves to the next.
 * Stops while `paused`, and shows the first line whole for reduced motion.
 */
export function useTypewriter(lines: string[], paused = false): string {
  const [line, setLine] = useState(0);
  const [length, setLength] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (paused || reduced) return;
    const done = length >= lines[line].length;
    const timer = setTimeout(
      () => {
        if (!done) return setLength(length + 1);
        setLength(0);
        setLine((line + 1) % lines.length);
      },
      done ? HOLD_MS : TYPE_MS
    );
    return () => clearTimeout(timer);
  }, [lines, line, length, paused, reduced]);

  return reduced ? lines[0] : lines[line].slice(0, length);
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseCopyResult {
  /** Whether the last copy succeeded and is still showing feedback. */
  copied: boolean;
  /** Copy `text` to the clipboard; returns whether it succeeded. */
  copy: (text: string) => Promise<boolean>;
}

/**
 * Clipboard copy with transient "copied" feedback that auto-resets.
 * Shared by the generator tools so each one need not reimplement it.
 */
export function useCopy(resetMs = 1500): UseCopyResult {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), resetMs);
        return true;
      } catch {
        return false;
      }
    },
    [resetMs],
  );

  return { copied, copy };
}

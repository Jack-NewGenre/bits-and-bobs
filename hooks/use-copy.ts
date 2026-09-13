"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseCopyResult {
  /** Whether the last copy succeeded and is still showing feedback. */
  copied: boolean;
  /** Copy `text` to the clipboard; returns whether it succeeded. */
  copy: (text: string) => Promise<boolean>;
}

/**
 * The modern clipboard API needs a secure context and a permission the
 * browser may refuse. When it does, this puts the text in a hidden field,
 * selects it and asks the document to copy the selection, the old way,
 * deprecated but still honoured everywhere, and the only thing that works
 * when the page is served over plain http.
 */
function copyViaSelection(text: string): boolean {
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  // Kept out of view, and out of the tab order, but still selectable.
  field.style.cssText = "position:fixed;top:-9999px;opacity:0";
  document.body.appendChild(field);

  try {
    field.select();
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
  }
}

/**
 * Clipboard copy with transient "copied" feedback that auto-resets.
 * Shared by every tool, so none of them reimplements it.
 */
export function useCopy(resetMs = 1500): UseCopyResult {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text: string) => {
      let ok = false;
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch {
        ok = copyViaSelection(text);
      }

      if (!ok) return false;

      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), resetMs);
      return true;
    },
    [resetMs],
  );

  return { copied, copy };
}

"use client";

import { useEffect, useState } from "react";

import { enhanceImage, type EnhanceSettings } from "@/lib/enhance";

export interface EnhancedResult {
  /** Enhanced output blob. */
  blob?: Blob;
  /** Object URL for previewing the result. */
  url?: string;
  isProcessing: boolean;
}

/** Debounce so dragging a slider doesn't spawn a pass on every tick. */
const DEBOUNCE_MS = 180;

/**
 * Re-enhances the source file whenever the chosen settings change, cancelling
 * any in-flight pass. Returns the latest preview blob + object URL.
 */
export function useEnhancedResult(
  file: File | undefined,
  settings: EnhanceSettings,
): EnhancedResult {
  const [result, setResult] = useState<EnhancedResult>({
    isProcessing: false,
  });

  useEffect(() => {
    if (!file) {
      // Defer the reset to avoid a synchronous cascading render.
      queueMicrotask(() => setResult({ isProcessing: false }));
      return;
    }

    let cancelled = false;
    let createdUrl: string | undefined;
    const controller = new AbortController();

    const timer = setTimeout(() => {
      setResult((prev) =>
        prev.isProcessing ? prev : { ...prev, isProcessing: true },
      );

      enhanceImage(file, settings, { signal: controller.signal })
        .then((blob) => {
          if (cancelled) return;
          createdUrl = URL.createObjectURL(blob);
          setResult({ blob, url: createdUrl, isProcessing: false });
        })
        .catch((error: unknown) => {
          if (cancelled || (error as Error)?.name === "AbortError") return;
          setResult({ isProcessing: false });
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [file, settings]);

  return result;
}

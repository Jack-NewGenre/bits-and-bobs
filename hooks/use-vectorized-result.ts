"use client";

import { useEffect, useState } from "react";

import { vectorizeImage, type VectorizeSettings } from "@/lib/vectorize";

export interface VectorizedResult {
  /** The generated SVG markup. */
  svg?: string;
  /** SVG output blob. */
  blob?: Blob;
  /** Object URL for previewing the result. */
  url?: string;
  isProcessing: boolean;
}

/** Debounce so dragging a slider doesn't spawn a trace on every tick. */
const DEBOUNCE_MS = 250;

/**
 * Re-traces the source file whenever the chosen settings change, cancelling
 * any in-flight pass. Returns the latest SVG markup, blob and object URL.
 */
export function useVectorizedResult(
  file: File | undefined,
  settings: VectorizeSettings,
): VectorizedResult {
  const [result, setResult] = useState<VectorizedResult>({
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

      vectorizeImage(file, settings, { signal: controller.signal })
        .then(({ svg, blob }) => {
          if (cancelled) return;
          createdUrl = URL.createObjectURL(blob);
          setResult({ svg, blob, url: createdUrl, isProcessing: false });
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

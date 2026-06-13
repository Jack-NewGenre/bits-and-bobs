"use client";

import { useEffect, useState } from "react";

import { compositeCutout, type BackgroundMode } from "@/lib/composite";

export interface BackgroundSettings {
  mode: BackgroundMode;
  color: string;
  /** Object URL of a user-supplied background image. */
  imageUrl?: string;
}

interface CompositedResult {
  /** PNG blob with the chosen background applied. */
  blob?: Blob;
  /** Object URL for previewing the composited result. */
  url?: string;
  isComposing: boolean;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load background image"));
    img.src = url;
  });
}

/**
 * Re-composites a cutout whenever the chosen background changes.
 * For transparent mode it returns the cutout directly.
 */
export function useCompositedResult(
  cutout: Blob | undefined,
  settings: BackgroundSettings,
): CompositedResult {
  const [result, setResult] = useState<CompositedResult>({
    isComposing: false,
  });

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | undefined;

    if (!cutout) {
      // Defer the reset out of the effect body to avoid a synchronous,
      // cascading render.
      queueMicrotask(() => {
        if (!cancelled) setResult({ isComposing: false });
      });
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      setResult((prev) =>
        prev.isComposing ? prev : { ...prev, isComposing: true },
      );

      const background =
        settings.mode === "image" && settings.imageUrl
          ? await loadImage(settings.imageUrl)
          : undefined;

      const blob = await compositeCutout(cutout, {
        mode: settings.mode,
        color: settings.color,
        background,
      });

      if (cancelled) return;
      createdUrl = URL.createObjectURL(blob);
      setResult({ blob, url: createdUrl, isComposing: false });
    })().catch(() => {
      if (!cancelled) setResult({ isComposing: false });
    });

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [cutout, settings.mode, settings.color, settings.imageUrl]);

  return result;
}

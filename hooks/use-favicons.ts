"use client";

import { useEffect, useRef, useState } from "react";

import {
  renderFavicons,
  type Favicon,
  type FaviconSettings,
} from "@/lib/image/favicon";

export interface FaviconPreview extends Favicon {
  url: string;
}

export interface FaviconSet {
  favicons: FaviconPreview[];
  error?: string;
  isRendering: boolean;
}

const EMPTY: FaviconSet = { favicons: [], isRendering: false };

/** Wait for a pause in dragging the crop before redrawing eight canvases. */
const DEBOUNCE_MS = 120;

/**
 * Render every icon size from the decoded image, redrawing as the crop or
 * radius changes. The previous set stays on screen until the next one lands,
 * then its object URLs are revoked.
 */
export function useFavicons(
  image: CanvasImageSource | undefined,
  settings: FaviconSettings | undefined,
): FaviconSet {
  const [set, setSet] = useState<FaviconSet>(EMPTY);
  const urls = useRef<string[]>([]);

  const replace = (next: FaviconSet) => {
    urls.current.forEach((url) => URL.revokeObjectURL(url));
    urls.current = next.favicons.map(({ url }) => url);
    setSet(next);
  };

  useEffect(() => {
    if (!image || !settings) {
      queueMicrotask(() => replace(EMPTY));
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      setSet((current) => ({ ...current, isRendering: true }));
      renderFavicons(image, settings)
        .then((rendered) => {
          if (cancelled) return;
          replace({
            favicons: rendered.map((favicon) => ({
              ...favicon,
              url: URL.createObjectURL(favicon.blob),
            })),
            isRendering: false,
          });
        })
        .catch(() => {
          if (!cancelled)
            replace({ ...EMPTY, error: "Could not draw the icons." });
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [image, settings]);

  useEffect(
    () => () => urls.current.forEach((url) => URL.revokeObjectURL(url)),
    [],
  );

  return set;
}

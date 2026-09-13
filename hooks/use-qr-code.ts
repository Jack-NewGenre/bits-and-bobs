"use client";

import { useEffect, useState } from "react";

import {
  buildMatrix,
  matrixToSvg,
  type QrSettings,
} from "@/lib/qr";

export interface QrCode {
  svg?: string;
  /** Modules per side, before the quiet zone. */
  size?: number;
  error?: string;
  isBuilding: boolean;
}

/** Debounce so typing a URL does not re-encode on every keystroke. */
const DEBOUNCE_MS = 150;

/**
 * Encode text into a styled QR code, re-running as the text or the styling
 * changes. Encoding is asynchronous only because the encoder is loaded on
 * demand; the work itself is fast enough to stay on the main thread.
 */
export function useQrCode(text: string, settings: QrSettings): QrCode {
  const [code, setCode] = useState<QrCode>({ isBuilding: false });

  useEffect(() => {
    if (text === "") {
      queueMicrotask(() => setCode({ isBuilding: false }));
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      buildMatrix(text, settings.ecc)
        .then((matrix) => {
          if (cancelled) return;
          setCode({
            svg: matrixToSvg(matrix, settings),
            size: matrix.length,
            isBuilding: false,
          });
        })
        .catch((failure: unknown) => {
          if (cancelled) return;
          setCode({
            isBuilding: false,
            error:
              failure instanceof Error
                ? "That is too much text for a QR code. Shorten it, or lower the error correction."
                : "Could not build a QR code from that.",
          });
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text, settings]);

  return code;
}

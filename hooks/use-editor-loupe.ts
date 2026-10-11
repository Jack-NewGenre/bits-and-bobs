"use client";

import { useEffect, useState } from "react";
import type { Canvas } from "fabric";

import { renderDocument } from "@/lib/image/editor/canvas-io";
import type { EditorDocument } from "@/lib/image/editor/document";
import {
  loupePlacement,
  loupeSource,
  pixelColour,
} from "@/lib/image/editor/loupe";
import type { Point2D } from "@/lib/image/editor/shapes";

export interface Loupe {
  /** The flattened document the loupe magnifies. */
  source: HTMLCanvasElement;
  /** The top-left document pixel shown. */
  from: Point2D;
  left: number;
  top: number;
  /** The colour a click would pick, or null where there is none. */
  colour: string | null;
}

/**
 * Follows the pointer with the eyedropper's magnifier. The document is
 * flattened once when the tool is picked, and again after each change, so a
 * move only reads pixels rather than redrawing every layer.
 */
export function useEditorLoupe(
  canvas: Canvas | null,
  doc: EditorDocument,
  active: boolean,
  version: number,
): Loupe | null {
  const [loupe, setLoupe] = useState<Loupe | null>(null);

  useEffect(() => {
    if (!canvas || !active) return;
    const source = renderDocument(canvas, doc, 1);
    const pixels = source.getContext("2d", { willReadFrequently: true });
    const hide = () => setLoupe(null);

    const offMove = canvas.on("mouse:move", ({ scenePoint, viewportPoint }) =>
      setLoupe({
        source,
        from: loupeSource(scenePoint),
        ...loupePlacement(viewportPoint, {
          width: canvas.width,
          height: canvas.height,
        }),
        colour: pixels && pixelColour(pixels, doc, scenePoint),
      }),
    );
    // The DOM event, as Fabric's own `mouse:out` also fires on leaving a layer.
    const element = canvas.upperCanvasEl;
    element.addEventListener("pointerleave", hide);
    return () => {
      offMove();
      element.removeEventListener("pointerleave", hide);
      hide();
    };
  }, [canvas, doc, active, version]);

  return loupe;
}

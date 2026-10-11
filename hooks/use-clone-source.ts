"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Point, type Canvas } from "fabric";

import {
  cloneMarker,
  cloneOffset,
  NO_CLONE_SOURCE,
  type CloneSource,
} from "@/lib/image/editor/clone";
import type { Point2D } from "@/lib/image/editor/shapes";

interface CloneSourceState {
  clone: RefObject<CloneSource>;
  /** The crosshair over the pixels being copied, in viewport pixels. */
  marker: Point2D | null;
}

/**
 * The clone stamp's source: an Alt-click picks it, each stroke fixes its
 * offset as it starts, and a crosshair shows where the pixels come from.
 */
export function useCloneSource(
  canvas: Canvas | null,
  active: boolean,
  aligned: boolean,
): CloneSourceState {
  const clone = useRef<CloneSource>(NO_CLONE_SOURCE);
  const [marker, setMarker] = useState<Point2D | null>(null);

  useEffect(() => {
    if (!canvas || !active) return;
    let pointer: Point2D | null = null;
    let drawing = false;

    const show = () => {
      const at =
        pointer && cloneMarker(pointer, clone.current, drawing || aligned);
      setMarker(
        at && new Point(at.x, at.y).transform(canvas.viewportTransform),
      );
    };
    const hide = () => setMarker(null);

    const offDown = canvas.on("mouse:down:before", ({ e }) => {
      if (!canvas.isDrawingMode) return;
      const point = canvas.getScenePoint(e);
      drawing = !e.altKey;
      clone.current = e.altKey
        ? { source: point, offset: null }
        : {
            ...clone.current,
            offset: cloneOffset(point, clone.current, aligned),
          };
      pointer = point;
      show();
    });
    const offMove = canvas.on("mouse:move", ({ scenePoint }) => {
      pointer = scenePoint;
      show();
    });
    const offUp = canvas.on("mouse:up", () => {
      drawing = false;
      show();
    });
    // The DOM event, as Fabric's own `mouse:out` also fires on leaving a layer.
    const element = canvas.upperCanvasEl;
    element.addEventListener("pointerleave", hide);
    return () => {
      offDown();
      offMove();
      offUp();
      element.removeEventListener("pointerleave", hide);
      hide();
    };
  }, [canvas, active, aligned]);

  return { clone, marker };
}

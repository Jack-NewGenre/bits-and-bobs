"use client";

import { useCallback, useRef, type RefObject } from "react";
import type { Canvas } from "fabric";
import { toast } from "sonner";

import type { EditorDocument } from "@/lib/image/editor/document";
import { singleLayer } from "@/lib/image/editor/layers";
import { dilateMask, maskBounds } from "@/lib/image/editor/pixels";
import { paintMaskedLayer, pixelLayerFor } from "@/lib/image/editor/masks";
import {
  blankCanvas,
  context2d,
  pixelsToCanvas,
  readPixels,
  settlePixels,
} from "@/lib/image/editor/raster";
import {
  selectionCanvas,
  type Selection,
} from "@/lib/image/editor/selection-mask";
import { contentAwareFillInWorker } from "@/lib/workers/inpaint-worker-client";

/** Grown into the surroundings like Photoshop, so a loose selection's halo is replaced too. */
const HOLE_GROWTH = 2;

/**
 * Photoshop's Content-Aware Fill: replaces the selected pixels of the
 * selected layer with texture found elsewhere in that layer. The work runs in
 * a worker, as it can take a second or two.
 */
export function useContentAwareFill(
  canvas: Canvas | null,
  doc: EditorDocument,
  selectionRef: RefObject<Selection | null>,
  commit: () => void,
) {
  const busy = useRef(false);

  return useCallback(async () => {
    const current = selectionRef.current;
    const target = canvas && singleLayer(canvas.getActiveObject());
    if (!canvas || !current || !target)
      return void toast("Select a layer and an area to fill.");
    if (busy.current) return;
    busy.current = true;
    const working = toast.loading("Filling…");
    try {
      const { layer } = pixelLayerFor(canvas, target);
      const { width, height } = doc;

      // The layer's own pixels laid out on the document, without adjustments or masks.
      const flat = blankCanvas(width, height);
      const ctx = context2d(flat);
      ctx.setTransform(...layer.calcTransformMatrix());
      ctx.drawImage(
        layer._originalElement,
        -layer.width / 2,
        -layer.height / 2,
      );
      const hole = dilateMask(current.mask, width, height, HOLE_GROWTH);
      const grown = { ...current, mask: hole };

      const filled = await contentAwareFillInWorker(
        { data: readPixels(flat, width, height).data, width, height },
        hole,
      );
      const result = pixelsToCanvas(filled, width, height);
      paintMaskedLayer(
        layer,
        (paint, _base, toPixels) => {
          paint.setTransform(...toPixels);
          paint.drawImage(result, 0, 0);
        },
        {
          clip: selectionCanvas(grown),
          reach: maskBounds(hole, width, height),
        },
      );
      canvas.setActiveObject(layer);
      canvas.requestRenderAll();
      await settlePixels(layer);
      canvas.requestRenderAll();
      commit();
      toast.dismiss(working);
    } catch {
      toast.error("That area could not be filled.", { id: working });
    } finally {
      busy.current = false;
    }
  }, [canvas, doc, selectionRef, commit]);
}

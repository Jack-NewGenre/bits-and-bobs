"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import type { Canvas } from "fabric";
import { toast } from "sonner";

import { singleLayer } from "@/lib/image/editor/layers";
import {
  getMask,
  maskFromSelection,
  pixelLayerFor,
  removeMask,
  revealAll,
  setMask,
  syncClipPaths,
} from "@/lib/image/editor/masks";
import { paintLayer, settlePixels } from "@/lib/image/editor/raster";
import {
  selectionCanvas,
  type Selection,
} from "@/lib/image/editor/selection-mask";

/** Clip paths follow the layers whenever the stack or a layer changes. */
const RESYNC = ["object:added", "object:removed", "object:modified"] as const;

/**
 * Layer masks and clipping masks for the selected layer. A new mask shows the
 * selection, or everything if nothing is selected. While a mask is being
 * edited, the brush reveals and the eraser hides.
 */
export function useEditorMasks(
  canvas: Canvas | null,
  selection: RefObject<Selection | null>,
) {
  const [editingMask, setEditingMask] = useState(false);

  const resync = useCallback(() => {
    if (!canvas) return;
    syncClipPaths(canvas);
    canvas.requestRenderAll();
  }, [canvas]);

  useEffect(() => {
    if (!canvas) return;
    const offs = RESYNC.map((name) => canvas.on(name, resync));
    return () => offs.forEach((off) => off());
  }, [canvas, resync]);

  /** Runs a change on the one selected layer, then resyncs and records it. */
  const onLayer = useCallback(
    async (
      run: (
        layer: NonNullable<ReturnType<typeof singleLayer>>,
      ) => Promise<void> | void,
    ) => {
      const layer = canvas && singleLayer(canvas.getActiveObject());
      if (!layer) return void toast("Select one layer first.");
      await run(layer);
      // Updates the layers panel and clip paths, and records an undo step.
      canvas.fire("object:modified", {
        target: canvas.getActiveObject() ?? layer,
      });
    },
    [canvas],
  );

  const addMask = useCallback(
    () =>
      onLayer(async (layer) => {
        const current = selection.current;
        const mask = current
          ? maskFromSelection(layer, selectionCanvas(current))
          : revealAll(layer.width, layer.height);
        const pending = setMask(layer, mask);
        setEditingMask(true);
        await pending;
      }),
    [onLayer, selection],
  );

  const deleteMask = useCallback(
    () =>
      onLayer((layer) => {
        removeMask(layer);
        setEditingMask(false);
      }),
    [onLayer],
  );

  /** Bakes the mask into the layer's pixels, as Photoshop's "Apply Layer Mask". */
  const applyMask = useCallback(
    () =>
      onLayer(async (object) => {
        const mask = getMask(object);
        if (!canvas || !mask) return;
        // A shape or text layer has its mask baked in as it is rasterised.
        const { layer, rasterised } = pixelLayerFor(canvas, object);
        removeMask(object);
        // Otherwise cut away everything the mask hid.
        if (!rasterised)
          paintLayer(
            layer,
            (ctx) => {
              ctx.setTransform(1, 0, 0, 1, 0, 0);
              ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
              ctx.globalCompositeOperation = "destination-out";
              ctx.drawImage(mask, 0, 0);
            },
            { erase: true },
          );
        setEditingMask(false);
        canvas.setActiveObject(layer);
        await settlePixels(layer);
      }),
    [canvas, onLayer],
  );

  const toggleClipping = useCallback(
    () =>
      onLayer((layer) => {
        layer.set({ clipped: !layer.clipped });
      }),
    [onLayer],
  );

  return {
    editingMask,
    setEditingMask,
    addMask,
    deleteMask,
    applyMask,
    toggleClipping,
    resync,
  };
}

export type EditorMasks = ReturnType<typeof useEditorMasks>;

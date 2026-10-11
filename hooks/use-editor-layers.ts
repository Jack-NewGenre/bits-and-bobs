"use client";

import { useCallback, useEffect, useState } from "react";
import { ActiveSelection, type Canvas, type FabricObject } from "fabric";

import type { Adjustments } from "@/lib/image/editor/adjustments";
import type { LayerStyles } from "@/lib/image/editor/layer-styles";
import type { EditorDocument } from "@/lib/image/editor/document";
import { useLayerThumbnails } from "@/hooks/use-layer-thumbnails";
import { createPixelLayer } from "@/lib/image/editor/raster";
import { syncClipPaths } from "@/lib/image/editor/masks";
import { arrangeStack, type ArrangeDirection } from "@/lib/image/editor/arrange";
import {
  applyLock,
  newLayerId,
  nextLayerName,
  summariseLayers,
  tagLayer,
  type LayerSummary,
} from "@/lib/image/editor/layers";
import {
  applyAdjustments,
  applyLayerStyles,
  applyStyle,
  applyTransform,
  describeSelection,
  type SelectionProps,
  type StylePatch,
  type TransformOp,
} from "@/lib/image/editor/selection";

const WATCHED = [
  "object:added",
  "object:removed",
  "object:modified",
  "selection:created",
  "selection:updated",
  "selection:cleared",
] as const;

/** The layers list and selected layer's properties, plus every panel action (each commits). */
export function useEditorLayers(
  canvas: Canvas | null,
  doc: EditorDocument | null,
  commit: () => void,
) {
  // Tagged with its canvas, so a new document starts with an empty panel.
  const [state, setState] = useState<{
    canvas: Canvas | null;
    layers: LayerSummary[];
    selection: SelectionProps | null;
  }>({ canvas: null, layers: [], selection: null });
  const current = state.canvas === canvas && canvas !== null;
  const layers = current ? state.layers : [];
  const selection = current ? state.selection : null;
  const thumbnails = useLayerThumbnails(canvas);

  const refresh = useCallback(() => {
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    setState({
      canvas,
      layers: summariseLayers(canvas.getObjects(), active),
      selection: active.length === 1 ? describeSelection(active[0]) : null,
    });
  }, [canvas]);

  useEffect(() => {
    if (!canvas) return;
    const offs = WATCHED.map((name) => canvas.on(name, refresh));
    return () => offs.forEach((off) => off());
  }, [canvas, refresh]);

  const find = useCallback(
    (id: string) =>
      canvas?.getObjects().find((object) => object.layerId === id),
    [canvas],
  );

  /** Runs a change, redraws, updates the panels and records an undo step. */
  const change = useCallback(
    (run: (canvas: Canvas) => void) => {
      if (!canvas) return;
      run(canvas);
      // Reordering fires no object event, so clipped layers would keep their old base.
      syncClipPaths(canvas);
      canvas.requestRenderAll();
      refresh();
      commit();
    },
    [canvas, refresh, commit],
  );

  const eachSelected = useCallback(
    (run: (object: FabricObject) => void) =>
      change((c) => c.getActiveObjects().forEach(run)),
    [change],
  );

  const selectLayer = useCallback(
    (id: string, additive: boolean) => {
      const object = find(id);
      if (!canvas || !object || object.locked) return;
      const current = canvas.getActiveObjects();
      const next = additive
        ? current.includes(object)
          ? current.filter((item) => item !== object)
          : [...current, object]
        : [object];
      canvas.discardActiveObject();
      if (next.length === 1) canvas.setActiveObject(next[0]);
      if (next.length > 1)
        canvas.setActiveObject(new ActiveSelection(next, { canvas }));
      canvas.requestRenderAll();
      refresh();
    },
    [canvas, find, refresh],
  );

  const updateLayer = useCallback(
    (id: string, run: (object: FabricObject, canvas: Canvas) => void) =>
      change((c) => {
        const object = find(id);
        if (object) run(object, c);
      }),
    [change, find],
  );

  const toggleVisible = useCallback(
    (id: string) =>
      updateLayer(id, (object, c) => {
        object.set({ visible: !object.visible });
        if (!object.visible) c.discardActiveObject();
      }),
    [updateLayer],
  );

  const toggleLocked = useCallback(
    (id: string) =>
      updateLayer(id, (object, c) => {
        applyLock(object, !object.locked);
        if (object.locked) c.discardActiveObject();
      }),
    [updateLayer],
  );

  const renameLayer = useCallback(
    (id: string, name: string) =>
      updateLayer(id, (object) =>
        object.set({ layerName: name.trim() || object.layerName }),
      ),
    [updateLayer],
  );

  /** `index` counts from the top of the panel, which is the end of the stack. */
  const moveLayer = useCallback(
    (id: string, index: number) =>
      updateLayer(id, (object, c) =>
        c.moveObjectTo(object, c.getObjects().length - 1 - index),
      ),
    [updateLayer],
  );

  const arrange = useCallback(
    (direction: ArrangeDirection) =>
      change((c) =>
        arrangeStack(c.getObjects(), new Set(c.getActiveObjects()), direction).forEach(
          (object, index) => c.moveObjectTo(object, index),
        ),
      ),
    [change],
  );

  const removeSelected = useCallback(
    () =>
      change((c) => {
        const active = c.getActiveObjects();
        c.discardActiveObject();
        c.remove(...active);
      }),
    [change],
  );

  /** An empty pixel layer the size of the canvas, just above the selection. */
  const createLayer = useCallback(() => {
    if (!doc) return;
    change((c) => {
      const objects = c.getObjects();
      const indices = c
        .getActiveObjects()
        .map((object) => objects.indexOf(object));
      const layer = createPixelLayer({
        left: 0,
        top: 0,
        width: doc.width,
        height: doc.height,
      });
      tagLayer(layer, "drawing", "Layer", objects);
      c.discardActiveObject();
      c.insertAt(
        indices.length > 0 ? Math.max(...indices) + 1 : objects.length,
        layer,
      );
      c.setActiveObject(layer);
    });
  }, [doc, change]);

  const duplicateSelected = useCallback(async () => {
    if (!canvas) return;
    const names = canvas.getObjects().map((object) => object.layerName ?? "");
    // Inside an ActiveSelection the coordinates are relative to its centre.
    const originals = canvas.getActiveObjects();
    canvas.discardActiveObject();
    const copies = await Promise.all(
      originals.map(async (object) => {
        const copy = await object.clone();
        const layerName = nextLayerName(
          `${object.layerName ?? "Layer"} copy`,
          names,
        );
        names.push(layerName);
        copy.set({
          layerId: newLayerId(),
          layerName,
          left: copy.left + 20,
          top: copy.top + 20,
        });
        return copy;
      }),
    );
    change((c) => {
      c.add(...copies);
      if (copies.length === 1) c.setActiveObject(copies[0]);
    });
  }, [canvas, change]);

  const selectAll = useCallback(() => {
    if (!canvas) return;
    const pickable = canvas
      .getObjects()
      .filter((object) => object.visible && !object.locked);
    canvas.discardActiveObject();
    if (pickable.length > 0)
      canvas.setActiveObject(new ActiveSelection(pickable, { canvas }));
    canvas.requestRenderAll();
    refresh();
  }, [canvas, refresh]);

  const deselect = useCallback(() => {
    canvas?.discardActiveObject();
    canvas?.requestRenderAll();
    refresh();
  }, [canvas, refresh]);

  const updateStyle = useCallback(
    (patch: StylePatch) => eachSelected((object) => applyStyle(object, patch)),
    [eachSelected],
  );

  const setAdjustments = useCallback(
    (adjustments: Adjustments) =>
      eachSelected((object) => applyAdjustments(object, adjustments)),
    [eachSelected],
  );

  const setLayerStyles = useCallback(
    (styles: LayerStyles) =>
      eachSelected((object) => applyLayerStyles(object, styles)),
    [eachSelected],
  );

  const transform = useCallback(
    (op: TransformOp) => {
      const active = canvas?.getActiveObject();
      if (!active || !doc) return;
      change(() => applyTransform(active, op, doc));
    },
    [canvas, doc, change],
  );

  const nudge = useCallback(
    (dx: number, dy: number) => {
      const active = canvas?.getActiveObject();
      if (!active) return;
      change(() => {
        active.set({ left: active.left + dx, top: active.top + dy });
        active.setCoords();
      });
    },
    [canvas, change],
  );

  return {
    layers,
    thumbnails,
    selection,
    refresh,
    selectLayer,
    toggleVisible,
    toggleLocked,
    renameLayer,
    moveLayer,
    arrange,
    createLayer,
    removeSelected,
    duplicateSelected,
    selectAll,
    deselect,
    updateStyle,
    setAdjustments,
    setLayerStyles,
    transform,
    nudge,
  };
}

export type EditorLayers = ReturnType<typeof useEditorLayers>;

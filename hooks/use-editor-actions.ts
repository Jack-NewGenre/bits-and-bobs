"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { Canvas } from "fabric";

import { singleLayer } from "@/lib/image/editor/layers";
import { pixelLayerFor } from "@/lib/image/editor/masks";
import { paintLayer, settlePixels } from "@/lib/image/editor/raster";
import { selectionCanvas } from "@/lib/image/editor/selection-mask";
import {
  BRUSH_TOOLS,
  type EditorAction,
  type EditorTool,
} from "@/lib/image/editor/shortcuts";
import {
  DEFAULT_TOOL_STYLE,
  toggleVariant,
  type ToolStyle,
} from "@/lib/image/editor/tool-style";
import type { EditorHistory } from "@/hooks/use-editor-history";
import type { EditorLayers } from "@/hooks/use-editor-layers";
import type { EditorMasks } from "@/hooks/use-editor-masks";
import type { EditorProject } from "@/hooks/use-editor-project";
import type { EditorSelection } from "@/hooks/use-editor-selection";
import { useEditorShortcuts } from "@/hooks/use-editor-shortcuts";

const BRUSH_STEP = 4;
const HARDNESS_STEP = 25;

/** Tools whose number keys set the paint's opacity rather than the layer's. */
const PAINTS = (tool: EditorTool) =>
  BRUSH_TOOLS.has(tool) || tool === "fill" || tool === "gradient";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

interface ActionDeps {
  canvas: Canvas | null;
  tool: EditorTool;
  setTool: (tool: EditorTool) => void;
  style: ToolStyle;
  setStyle: Dispatch<SetStateAction<ToolStyle>>;
  history: EditorHistory;
  layers: EditorLayers;
  masks: EditorMasks;
  setSnapping: Dispatch<SetStateAction<boolean>>;
  selection: EditorSelection;
  project: EditorProject;
  zoomStep: (direction: 1 | -1) => void;
  zoomFit: () => void;
  zoomTo: (zoom: number) => void;
  onOpen: () => void;
}

/**
 * Turns menu picks and keyboard shortcuts into editor changes. With pixels
 * selected, Delete clears them from the layer and Escape drops the selection
 * first, as in Photoshop.
 */
export function useEditorActions(deps: ActionDeps) {
  const {
    canvas,
    tool,
    setTool,
    style,
    setStyle,
    history,
    layers,
    masks,
    selection,
    project,
  } = deps;
  const { setSnapping, zoomStep, zoomFit, zoomTo, onOpen } = deps;
  const { selectionRef } = selection;

  /**
   * Fills the selected layer with a colour, or clears it when `colour` is
   * null, inside the pixel selection if there is one.
   */
  const paintSelection = useCallback(
    (colour: string | null) => {
      const current = selectionRef.current;
      const target = canvas && singleLayer(canvas.getActiveObject());
      if (!canvas || !target || (!current && !colour)) return false;
      const { layer } = pixelLayerFor(canvas, target);
      paintLayer(
        layer,
        (ctx) => {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          if (colour) ctx.fillStyle = colour;
          ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        },
        { erase: !colour, clip: current && selectionCanvas(current) },
      );
      canvas.setActiveObject(layer);
      canvas.requestRenderAll();
      void settlePixels(layer).finally(() => {
        canvas.requestRenderAll();
        history.commit();
      });
      return true;
    },
    [canvas, selectionRef, history],
  );

  /** Picks the nearest visible, unlocked layer above or below the selected one. */
  const selectAdjacent = useCallback(
    (direction: "above" | "below") => {
      // Top of the stack first, so "above" walks towards index 0. With nothing
      // selected, "above" starts from the top and "below" from the bottom.
      const list = layers.layers;
      const above = direction === "above";
      const from = list.findLastIndex((layer) => layer.selected);
      const candidates =
        from === -1
          ? above
            ? list
            : [...list].reverse()
          : above
            ? list.slice(0, from).reverse()
            : list.slice(from + 1);
      const next = candidates.find((layer) => layer.visible && !layer.locked);
      if (next) layers.selectLayer(next.id, false);
    },
    [layers],
  );

  const runAction = useCallback(
    (action: EditorAction) => {
      switch (action.type) {
        case "tool":
          return setTool(action.tool);
        case "tool-variant":
          setTool(action.tool);
          return setStyle((s) => ({ ...s, ...toggleVariant(action.tool, s) }));
        case "undo":
          return void history.undo();
        case "redo":
          return void history.redo();
        case "delete":
          return void (paintSelection(null) || layers.removeSelected());
        case "fill":
          return void paintSelection(
            action.colour === "primary"
              ? style.brushColour
              : style.secondaryColour,
          );
        case "duplicate":
          return void layers.duplicateSelected();
        case "select-all":
          return selection.selectAll();
        case "select-all-layers":
          return layers.selectAll();
        case "deselect":
          return selection.selection ? selection.deselect() : layers.deselect();
        case "reselect":
          return selection.reselect();
        case "invert-selection":
          return selection.invert();
        case "save":
          return void project.saveFile();
        case "open":
          return onOpen();
        case "zoom-in":
          return zoomStep(1);
        case "zoom-out":
          return zoomStep(-1);
        case "zoom-fit":
          return zoomFit();
        case "zoom-actual":
          return zoomTo(1);
        case "nudge":
          return layers.nudge(action.dx, action.dy);
        case "arrange":
          return layers.arrange(action.direction);
        case "select-layer":
          return selectAdjacent(action.direction);
        case "clipping-mask":
          return void masks.toggleClipping();
        case "smart-guides":
          return setSnapping((on) => !on);
        case "opacity":
          if (PAINTS(tool))
            return setStyle((s) => ({ ...s, brushOpacity: action.value }));
          return layers.selection
            ? layers.updateStyle({ opacity: action.value })
            : undefined;
        case "default-colours":
          return setStyle((s) => ({
            ...s,
            brushColour: DEFAULT_TOOL_STYLE.brushColour,
            secondaryColour: DEFAULT_TOOL_STYLE.secondaryColour,
          }));
        case "swap-colours":
          return setStyle((s) => ({
            ...s,
            brushColour: s.secondaryColour,
            secondaryColour: s.brushColour,
          }));
        case "brush-size":
          return setStyle((s) => ({
            ...s,
            brushSize: clamp(s.brushSize + action.delta * BRUSH_STEP, 1, 200),
          }));
        case "brush-hardness":
          return setStyle((s) => ({
            ...s,
            brushHardness: clamp(
              s.brushHardness + action.delta * HARDNESS_STEP,
              0,
              100,
            ),
          }));
      }
    },
    [
      tool,
      setTool,
      style,
      setStyle,
      history,
      layers,
      masks,
      selection,
      project,
      paintSelection,
      selectAdjacent,
      setSnapping,
      zoomStep,
      zoomFit,
      zoomTo,
      onOpen,
    ],
  );

  useEditorShortcuts(true, runAction);

  return runAction;
}

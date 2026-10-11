"use client";

import { useEffect, useRef, type RefObject } from "react";
import {
  PencilBrush,
  type Canvas,
  type FabricObject,
  type TPointerEvent,
} from "fabric";

import {
  BRUSH_TOOLS,
  SELECTION_TOOLS,
  type EditorTool,
} from "@/lib/image/editor/shortcuts";
import { singleLayer, tagLayer } from "@/lib/image/editor/layers";
import { withOpacity } from "@/lib/image/editor/pixels";
import {
  createShape,
  createText,
  dragBounds,
  DEFAULT_SHAPE_SIZE,
  MIN_DRAG,
  resizeShape,
  SHAPE_NAMES,
  shapeLayerKind,
  type Point2D,
} from "@/lib/image/editor/shapes";
import type { ToolStyle } from "@/lib/image/editor/tool-style";

/** Tools that click on the canvas without picking a layer, keeping the current one. */
const KEEPS_LAYER = new Set<EditorTool>([
  ...SELECTION_TOOLS,
  "crop",
  "eyedropper",
  "fill",
  "gradient",
]);

/** Fabric's brush draws in this colour while the eraser, clone and dodge strokes are dragged out. */
const STENCIL_PREVIEW = "rgba(128, 128, 128, 0.5)";

/**
 * Wires the active tool into the canvas: drawing mode for the brush and
 * eraser (their strokes are handled by `useEditorPainting`), and dragging out
 * shapes or clicking to place text.
 */
export function useEditorTools(
  canvas: Canvas | null,
  tool: EditorTool,
  style: ToolStyle,
  onCreated: () => void,
  setTool: (tool: EditorTool) => void,
  panning: RefObject<boolean>,
) {
  const toolRef = useRef(tool);
  const styleRef = useRef(style);
  const callbacks = useRef({ onCreated, setTool });

  useEffect(() => {
    toolRef.current = tool;
    styleRef.current = style;
    callbacks.current = { onCreated, setTool };
  });

  // Put the canvas into the right mode for the tool.
  useEffect(() => {
    if (!canvas) return;
    const drawing = BRUSH_TOOLS.has(tool);
    const placing = tool === "shape" || tool === "text";
    const brush = drawing ? new PencilBrush(canvas) : undefined;
    if (brush) {
      brush.width = style.brushSize;
      brush.color =
        tool === "brush"
          ? withOpacity(style.brushColour, style.brushOpacity)
          : STENCIL_PREVIEW;
    }
    canvas.set({
      isDrawingMode: drawing,
      selection: tool === "select",
      skipTargetFind: tool !== "select",
      defaultCursor:
        tool === "hand" ? "grab" : tool === "select" ? "default" : "crosshair",
      ...(brush && { freeDrawingBrush: brush }),
    });
    if (placing || tool === "hand") canvas.discardActiveObject();
    canvas.requestRenderAll();
  }, [canvas, tool, style.brushSize, style.brushColour, style.brushOpacity]);

  // Selecting, cropping, sampling and filling keep the current layer, as in
  // Photoshop, though Fabric drops it on any click that misses a layer.
  useEffect(() => {
    if (!canvas) return;
    let kept: ReturnType<typeof singleLayer>;
    const offBefore = canvas.on("mouse:down:before", () => {
      kept = KEEPS_LAYER.has(toolRef.current)
        ? singleLayer(canvas.getActiveObject())
        : undefined;
    });
    const offAfter = canvas.on("mouse:up", () => {
      if (
        !kept ||
        !canvas.getObjects().includes(kept) ||
        canvas.getActiveObject()
      )
        return;
      canvas.setActiveObject(kept);
      canvas.requestRenderAll();
    });
    return () => {
      offBefore();
      offAfter();
    };
  }, [canvas]);

  // Shapes are dragged out; text is placed with a click.
  useEffect(() => {
    if (!canvas) return;
    let start: Point2D | null = null;
    let shape: FabricObject | null = null;

    const scene = (e: TPointerEvent) => canvas.getScenePoint(e);

    const offDown = canvas.on("mouse:down", ({ e }) => {
      if (panning.current) return;
      const current = toolRef.current;
      const s = styleRef.current;
      const at = scene(e);
      if (current === "text") {
        const text = createText(at, s.fill, s.fontSize, s.fontFamily);
        tagLayer(text, "text", "Text", canvas.getObjects());
        canvas.add(text);
        canvas.setActiveObject(text);
        callbacks.current.setTool("select");
        text.enterEditing();
        text.selectAll();
        callbacks.current.onCreated();
        return;
      }
      if (current !== "shape") return;
      const kind = s.shape;
      start = { x: at.x, y: at.y };
      shape = createShape(
        kind,
        { left: at.x, top: at.y, width: 0, height: 0 },
        s,
      );
      tagLayer(
        shape,
        shapeLayerKind(kind),
        SHAPE_NAMES[kind],
        canvas.getObjects(),
      );
      canvas.add(shape);
    });

    const offMove = canvas.on("mouse:move", ({ e }) => {
      if (!start || !shape) return;
      const at = scene(e);
      const { shape: kind, sides } = styleRef.current;
      resizeShape(
        shape,
        kind,
        start,
        dragBounds(start, at, e.shiftKey),
        at,
        sides,
      );
      canvas.requestRenderAll();
    });

    const offUp = canvas.on("mouse:up", ({ e }) => {
      if (!start || !shape) return;
      const at = scene(e);
      const { shape: kind, sides } = styleRef.current;
      const bounds = dragBounds(start, at, e.shiftKey);
      if (bounds.width < MIN_DRAG && bounds.height < MIN_DRAG) {
        const end = {
          x: start.x + DEFAULT_SHAPE_SIZE,
          y: start.y + DEFAULT_SHAPE_SIZE,
        };
        resizeShape(shape, kind, start, dragBounds(start, end), end, sides);
      }
      canvas.setActiveObject(shape);
      start = null;
      shape = null;
      callbacks.current.setTool("select");
      canvas.requestRenderAll();
      callbacks.current.onCreated();
    });

    return () => {
      offDown();
      offMove();
      offUp();
    };
  }, [canvas, panning]);
}

"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import type { Canvas, FabricObject, TPointerEvent } from "fabric";
import { toast } from "sonner";

import {
  intersectBounds,
  MAX_DIMENSION,
  unionBounds,
  type Bounds,
  type EditorDocument,
} from "@/lib/image/editor/document";
import { syncClipPaths } from "@/lib/image/editor/masks";
import { maskBounds } from "@/lib/image/editor/pixels";
import type { Selection } from "@/lib/image/editor/selection-mask";
import { dragBounds, type Point2D } from "@/lib/image/editor/shapes";
import type { EditorTool } from "@/lib/image/editor/shortcuts";

interface CropOptions {
  doc: EditorDocument;
  tool: EditorTool;
  /** Resizes the document, returning the new one, or null without a canvas. */
  updateDocument: (patch: Partial<EditorDocument>) => EditorDocument | null;
  zoomFit: (doc: EditorDocument) => void;
  deselect: () => void;
  onDone: () => void;
}

/** Smaller than this, in document pixels, a drag is a stray click. */
const MIN_CROP = 4;

/**
 * The crop tool: drag a box over the canvas and, on release, the document is
 * cut down to it. The area outside is dimmed while dragging. Shift keeps it
 * square. Also crops to content from the menu.
 */
export function useEditorCrop(
  canvas: Canvas | null,
  { doc, tool, updateDocument, zoomFit, deselect, onDone }: CropOptions,
  selectionRef: RefObject<Selection | null>,
) {
  /** Cuts the document down to a box, moving every layer with it. */
  const cropTo = useCallback(
    (box: Bounds) => {
      if (!canvas) return;
      canvas.discardActiveObject();
      canvas.getObjects().forEach((object) => {
        object.set({ left: object.left - box.left, top: object.top - box.top });
        object.setCoords();
      });
      // Clipping masks sit at fixed document positions, so they move with their layers.
      syncClipPaths(canvas);
      deselect();
      const next = updateDocument({
        width: Math.ceil(box.width),
        height: Math.ceil(box.height),
      });
      if (next) zoomFit(next);
      onDone();
    },
    [canvas, deselect, updateDocument, zoomFit, onDone],
  );

  /** Crops to the pixel selection, else the selected layers, else everything. */
  const cropToContent = useCallback(() => {
    if (!canvas) return;
    const pixels = selectionRef.current;
    const active = canvas.getActiveObjects();
    const targets: FabricObject[] =
      active.length > 0 ? active : canvas.getObjects();
    const box = pixels
      ? maskBounds(pixels.mask, pixels.width, pixels.height)
      : unionBounds(
          targets.filter((o) => o.visible).map((o) => o.getBoundingRect()),
        );
    if (!box) return;
    // The document cannot grow past this, so cropping would cut content off.
    if (Math.max(box.width, box.height) > MAX_DIMENSION)
      return void toast.error(
        `The content is larger than ${MAX_DIMENSION} px, so it cannot fit on one canvas.`,
      );
    cropTo(box);
  }, [canvas, selectionRef, cropTo]);

  const latest = useRef({ doc, tool, onCrop: cropTo });

  useEffect(() => {
    latest.current = { doc, tool, onCrop: cropTo };
  });

  useEffect(() => {
    if (!canvas) return;
    let start: Point2D | null = null;
    let box: Bounds | null = null;
    const scene = (e: TPointerEvent) => canvas.getScenePoint(e);

    const offDown = canvas.on("mouse:down", ({ e }) => {
      if (latest.current.tool !== "crop") return;
      start = scene(e);
      box = null;
    });
    const offMove = canvas.on("mouse:move", ({ e }) => {
      if (!start) return;
      const { doc } = latest.current;
      box = intersectBounds(dragBounds(start, scene(e), e.shiftKey), {
        left: 0,
        top: 0,
        width: doc.width,
        height: doc.height,
      });
      canvas.requestRenderAll();
    });
    const offUp = canvas.on("mouse:up", () => {
      if (!start) return;
      const picked = box;
      start = null;
      box = null;
      canvas.requestRenderAll();
      if (!picked || picked.width < MIN_CROP || picked.height < MIN_CROP)
        return;
      latest.current.onCrop({
        left: Math.round(picked.left),
        top: Math.round(picked.top),
        width: Math.round(picked.width),
        height: Math.round(picked.height),
      });
    });

    const offRender = canvas.on("after:render", ({ ctx }) => {
      if (ctx !== canvas.getContext() || !box) return;
      const { doc } = latest.current;
      ctx.save();
      ctx.transform(...canvas.viewportTransform);
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.beginPath();
      ctx.rect(0, 0, doc.width, doc.height);
      ctx.rect(box.left, box.top, box.width, box.height);
      ctx.fill("evenodd");
      ctx.lineWidth = 1 / canvas.getZoom();
      ctx.strokeStyle = "#fff";
      ctx.strokeRect(box.left, box.top, box.width, box.height);
      ctx.restore();
    });

    return () => {
      offDown();
      offMove();
      offUp();
      offRender();
    };
  }, [canvas]);

  return { cropToContent };
}

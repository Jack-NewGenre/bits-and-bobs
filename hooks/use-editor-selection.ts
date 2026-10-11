"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { Canvas, TPointerEvent } from "fabric";

import { useMagneticLasso } from "@/hooks/use-magnetic-lasso";
import { documentPixels } from "@/lib/image/editor/canvas-io";
import type { EditorDocument } from "@/lib/image/editor/document";
import {
  combineMasks,
  floodRegion,
  invertMask,
  maskOutline,
} from "@/lib/image/editor/pixels";
import {
  isEmptyMask,
  lassoMask,
  marqueeMask,
  MIN_LASSO_POINTS,
  type Selection,
} from "@/lib/image/editor/selection-mask";
import type { Point2D } from "@/lib/image/editor/shapes";
import type { EditorTool } from "@/lib/image/editor/shortcuts";
import {
  selectionModeFor,
  type ToolStyle,
} from "@/lib/image/editor/tool-style";

/** How often the marching ants step along, in milliseconds. */
const ANT_STEP = 120;

function drawOutline(
  ctx: CanvasRenderingContext2D,
  lines: readonly number[],
  offset: number,
) {
  ctx.beginPath();
  for (let i = 0; i < lines.length; i += 4) {
    ctx.moveTo(lines[i], lines[i + 1]);
    ctx.lineTo(lines[i + 2], lines[i + 3]);
  }
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = "#fff";
  ctx.lineDashOffset = 0;
  ctx.stroke();
  ctx.strokeStyle = "#000";
  ctx.lineDashOffset = offset;
  ctx.stroke();
}

/**
 * The pixel selection: a document-sized mask made with the marquee, lasso and
 * magic wand, shown with marching ants. Shift adds to it and Alt takes from
 * it, as in Photoshop. Paint, fills and gradients are clipped to it.
 */
export function useEditorSelection(
  canvas: Canvas | null,
  doc: EditorDocument,
  tool: EditorTool,
  style: ToolStyle,
  panning: RefObject<boolean>,
) {
  const [selection, setSelectionState] = useState<Selection | null>(null);
  const selectionRef = useRef<Selection | null>(null);
  const outline = useRef<number[]>([]);
  /** The last selection dropped, for Reselect. */
  const dropped = useRef<Selection | null>(null);
  const latest = useRef({ doc, tool, style });

  useEffect(() => {
    latest.current = { doc, tool, style };
  });

  const setSelection = useCallback(
    (next: Selection | null) => {
      const kept = next && !isEmptyMask(next.mask) ? next : null;
      if (!kept && selectionRef.current) dropped.current = selectionRef.current;
      selectionRef.current = kept;
      outline.current = kept
        ? maskOutline(kept.mask, kept.width, kept.height)
        : [];
      setSelectionState(kept);
      canvas?.requestRenderAll();
    },
    [canvas],
  );

  /** Merges a freshly drawn mask into the selection, by the tool's mode or the held keys. */
  const merge = useCallback(
    (mask: Uint8Array, event: { shiftKey: boolean; altKey: boolean }) => {
      const { doc, style } = latest.current;
      const current = selectionRef.current;
      const same =
        current && current.width === doc.width && current.height === doc.height;
      const mode = selectionModeFor(style.selectionMode, event);
      setSelection({
        mask: combineMasks(same ? current.mask : null, mask, mode),
        width: doc.width,
        height: doc.height,
      });
    },
    [setSelection],
  );

  const selectAll = useCallback(() => {
    const { width, height } = latest.current.doc;
    setSelection({
      mask: new Uint8Array(width * height).fill(255),
      width,
      height,
    });
  }, [setSelection]);

  useMagneticLasso(canvas, latest, merge, panning);

  const deselect = useCallback(() => setSelection(null), [setSelection]);

  const reselect = useCallback(() => {
    const last = dropped.current;
    const { doc } = latest.current;
    if (last && last.width === doc.width && last.height === doc.height)
      setSelection(last);
  }, [setSelection]);

  const invert = useCallback(() => {
    const current = selectionRef.current;
    if (!current) return selectAll();
    setSelection({ ...current, mask: invertMask(current.mask) });
  }, [selectAll, setSelection]);

  // Drag out a marquee or lasso; click with the wand.
  useEffect(() => {
    if (!canvas) return;
    let points: Point2D[] = [];
    const scene = (e: TPointerEvent) => canvas.getScenePoint(e);

    const offDown = canvas.on("mouse:down", ({ e }) => {
      const { tool, doc, style } = latest.current;
      if (panning.current) return;
      if (tool === "wand") {
        const at = scene(e);
        const region = floodRegion(
          documentPixels(canvas, doc),
          at.x,
          at.y,
          style.tolerance,
        );
        if (region) merge(region, e);
        return;
      }
      if (
        tool === "marquee" ||
        (tool === "lasso" && style.lasso === "freehand")
      )
        points = [scene(e)];
    });
    const offMove = canvas.on("mouse:move", ({ e }) => {
      if (points.length === 0) return;
      const at = scene(e);
      points =
        latest.current.tool === "lasso" ? [...points, at] : [points[0], at];
      canvas.requestRenderAll();
    });
    const offUp = canvas.on("mouse:up", ({ e }) => {
      if (points.length === 0) return;
      const { tool, doc, style } = latest.current;
      const drawn = points;
      points = [];
      const [from, to] = [drawn[0], drawn[drawn.length - 1]];
      const tiny = Math.abs(to.x - from.x) < 2 && Math.abs(to.y - from.y) < 2;
      if (tool === "lasso" ? drawn.length < MIN_LASSO_POINTS : tiny) {
        if (!e.shiftKey && !e.altKey) setSelection(null);
        return;
      }
      merge(
        tool === "lasso"
          ? lassoMask(doc.width, doc.height, drawn)
          : marqueeMask(doc.width, doc.height, style.marquee, from, to),
        e,
      );
    });

    // Draw on the screen only, never into an export.
    let offset = 0;
    const offRender = canvas.on("after:render", ({ ctx }) => {
      if (ctx !== canvas.getContext()) return;
      const lines = outline.current;
      if (lines.length === 0 && points.length === 0) return;
      // Coordinates are zoomed by hand rather than by the transform, so lines stay one pixel wide.
      ctx.save();
      ctx.translate(canvas.viewportTransform[4], canvas.viewportTransform[5]);
      const zoom = canvas.getZoom();
      const scaled = lines.map((value) => value * zoom);
      drawOutline(ctx, scaled, offset);
      if (points.length > 0) {
        const { tool, style } = latest.current;
        const path = points.map((point) => ({
          x: point.x * zoom,
          y: point.y * zoom,
        }));
        const [from, to] = [path[0], path[path.length - 1]];
        ctx.beginPath();
        if (tool === "lasso")
          path.forEach((p, i) =>
            i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y),
          );
        else if (style.marquee === "ellipse")
          ctx.ellipse(
            (from.x + to.x) / 2,
            (from.y + to.y) / 2,
            Math.abs(to.x - from.x) / 2,
            Math.abs(to.y - from.y) / 2,
            0,
            0,
            Math.PI * 2,
          );
        else ctx.rect(from.x, from.y, to.x - from.x, to.y - from.y);
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "#000";
        ctx.stroke();
      }
      ctx.restore();
    });
    const timer = window.setInterval(() => {
      if (outline.current.length === 0) return;
      offset = (offset + 1) % 8;
      canvas.requestRenderAll();
    }, ANT_STEP);

    return () => {
      offDown();
      offMove();
      offUp();
      offRender();
      window.clearInterval(timer);
    };
  }, [canvas, merge, panning, setSelection]);

  return {
    selection,
    selectionRef,
    setSelection,
    selectAll,
    deselect,
    reselect,
    invert,
  };
}

export type EditorSelection = ReturnType<typeof useEditorSelection>;

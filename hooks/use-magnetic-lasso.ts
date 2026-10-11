"use client";

import { useEffect, type RefObject } from "react";
import type { Canvas } from "fabric";

import { documentPixels } from "@/lib/image/editor/canvas-io";
import type { EditorDocument } from "@/lib/image/editor/document";
import { edgeCost } from "@/lib/image/editor/magnetic";
import {
  addAnchor,
  closeTrace,
  moveTrace,
  removeAnchor,
  startTrace,
  tracePoints,
  type EdgeMap,
  type MagneticTrace,
} from "@/lib/image/editor/magnetic-trace";
import { lassoMask } from "@/lib/image/editor/selection-mask";
import type { EditorTool } from "@/lib/image/editor/shortcuts";
import type { ToolStyle } from "@/lib/image/editor/tool-style";

/** How close, in screen pixels, a click must be to the first point to close the trace. */
const CLOSE_REACH = 8;

interface Latest {
  doc: EditorDocument;
  tool: EditorTool;
  style: ToolStyle;
}

type Merge = (
  mask: Uint8Array,
  event: { shiftKey: boolean; altKey: boolean },
) => void;

/**
 * Photoshop's Magnetic Lasso: click on an edge, then trace along it and the
 * line clings to the strongest edges, fixing points as it goes. Click to add
 * a point, Backspace removes one, Enter, a double-click or a click on the
 * first point closes it, and Escape gives up.
 */
export function useMagneticLasso(
  canvas: Canvas | null,
  latest: RefObject<Latest>,
  merge: Merge,
  panning: RefObject<boolean>,
) {
  useEffect(() => {
    if (!canvas) return;
    let map: EdgeMap | null = null;
    let trace: MagneticTrace | null = null;
    let keys = { shiftKey: false, altKey: false };

    const active = () => {
      const { tool, style } = latest.current;
      return tool === "lasso" && style.lasso === "magnetic";
    };
    const reset = () => {
      trace = null;
      map = null;
      canvas.requestRenderAll();
    };
    const close = () => {
      if (map && trace && tracePoints(trace).length > 2) {
        const { doc } = latest.current;
        merge(lassoMask(doc.width, doc.height, closeTrace(map, trace)), keys);
      }
      reset();
    };

    const offDown = canvas.on("mouse:down", ({ e }) => {
      if (!active() || panning.current) return;
      const at = canvas.getScenePoint(e);
      if (!trace || !map) {
        const { doc } = latest.current;
        const grid = documentPixels(canvas, doc);
        map = { cost: edgeCost(grid), width: grid.width, height: grid.height };
        trace = startTrace(map, at);
        keys = { shiftKey: e.shiftKey, altKey: e.altKey };
        return;
      }
      const start = trace.segments[0][0];
      const reach = CLOSE_REACH / canvas.getZoom();
      if (Math.hypot(at.x - start.x, at.y - start.y) <= reach) return close();
      trace = addAnchor(moveTrace(map, trace, at));
    });
    const offMove = canvas.on("mouse:move", ({ e }) => {
      if (!trace || !map || !active()) return;
      trace = moveTrace(map, trace, canvas.getScenePoint(e));
      canvas.requestRenderAll();
    });
    const offDouble = canvas.on("mouse:dblclick", () => {
      if (trace && active()) close();
    });
    const offRender = canvas.on("after:render", ({ ctx }) => {
      if (!trace || ctx !== canvas.getContext()) return;
      const [, , , , x, y] = canvas.viewportTransform;
      const zoom = canvas.getZoom();
      const points = tracePoints(trace);
      ctx.save();
      ctx.beginPath();
      points.forEach((p, i) =>
        i === 0
          ? ctx.moveTo(p.x * zoom + x, p.y * zoom + y)
          : ctx.lineTo(p.x * zoom + x, p.y * zoom + y),
      );
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#fff";
      ctx.stroke();
      ctx.lineDashOffset = 4;
      ctx.strokeStyle = "#000";
      ctx.stroke();
      ctx.setLineDash([]);
      for (const wire of trace.segments) {
        const anchor = wire[wire.length - 1];
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#000";
        ctx.fillRect(
          anchor.x * zoom + x - 2.5,
          anchor.y * zoom + y - 2.5,
          5,
          5,
        );
        ctx.strokeRect(
          anchor.x * zoom + x - 2.5,
          anchor.y * zoom + y - 2.5,
          5,
          5,
        );
      }
      ctx.restore();
    });

    // Captured ahead of the editor's shortcuts, so Backspace and Escape act on the trace only.
    const onKeyDown = (event: KeyboardEvent) => {
      if (!trace || !active()) return;
      if (event.key === "Enter") close();
      else if (event.key === "Escape") reset();
      else if (event.key === "Backspace" || event.key === "Delete") {
        trace = removeAnchor(trace);
        canvas.requestRenderAll();
      } else return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    window.addEventListener("keydown", onKeyDown, true);

    return () => {
      offDown();
      offMove();
      offDouble();
      offRender();
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [canvas, latest, merge, panning]);
}

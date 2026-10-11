"use client";

import { useEffect, useRef } from "react";
import type { Canvas, FabricObject } from "fabric";

import type { EditorDocument } from "@/lib/image/editor/document";
import {
  SNAP_DISTANCE,
  snapBox,
  snapLines,
  type Guide,
} from "@/lib/image/editor/snapping";

/**
 * Smart guides: a layer being dragged snaps its edges and centre to the
 * canvas and to the other layers, and a magenta line shows what it lined up
 * with. Holding Ctrl or Cmd moves freely.
 */
export function useEditorSnapping(
  canvas: Canvas | null,
  doc: EditorDocument,
  enabled: boolean,
) {
  const latest = useRef({ doc, enabled });

  useEffect(() => {
    latest.current = { doc, enabled };
  });

  useEffect(() => {
    if (!canvas) return;
    let guides: Guide[] = [];
    let others: ReturnType<typeof snapLines> | null = null;

    const offMoving = canvas.on("object:moving", ({ target, e }) => {
      const { doc, enabled } = latest.current;
      if (!enabled || e.metaKey || e.ctrlKey) {
        guides = [];
        return;
      }
      if (!others) {
        const moving = new Set<FabricObject>([
          target,
          ...canvas.getActiveObjects(),
        ]);
        const rest = canvas
          .getObjects()
          .filter((object) => object.visible && !moving.has(object));
        others = snapLines(
          doc,
          rest.map((object) => object.getBoundingRect()),
        );
      }
      const snap = snapBox(
        target.getBoundingRect(),
        others,
        SNAP_DISTANCE / canvas.getZoom(),
      );
      target.set({ left: target.left + snap.dx, top: target.top + snap.dy });
      target.setCoords();
      guides = snap.guides;
    });

    const offUp = canvas.on("mouse:up", () => {
      others = null;
      if (guides.length === 0) return;
      guides = [];
      canvas.requestRenderAll();
    });

    const offRender = canvas.on("after:render", ({ ctx }) => {
      if (ctx !== canvas.getContext() || guides.length === 0) return;
      const { doc } = latest.current;
      const v = canvas.viewportTransform;
      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#ec4899";
      ctx.beginPath();
      for (const guide of guides) {
        if (guide.axis === "x") {
          const x = Math.round(guide.at * v[0] + v[4]) + 0.5;
          ctx.moveTo(x, v[5]);
          ctx.lineTo(x, doc.height * v[3] + v[5]);
        } else {
          const y = Math.round(guide.at * v[3] + v[5]) + 0.5;
          ctx.moveTo(v[4], y);
          ctx.lineTo(doc.width * v[0] + v[4], y);
        }
      }
      ctx.stroke();
      ctx.restore();
    });

    return () => {
      offMoving();
      offUp();
      offRender();
    };
  }, [canvas]);
}

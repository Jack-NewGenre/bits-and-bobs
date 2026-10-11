"use client";

import { useEffect, useRef, type RefObject } from "react";
import { Path, type Canvas, type FabricImage, type FabricObject } from "fabric";
import { toast } from "sonner";

import { useCloneSource } from "@/hooks/use-clone-source";
import { renderDocument } from "@/lib/image/editor/canvas-io";
import {
  intersectBounds,
  type EditorDocument,
} from "@/lib/image/editor/document";
import { singleLayer, tagLayer } from "@/lib/image/editor/layers";
import {
  getMask,
  paintMaskedLayer,
  pixelLayerFor,
  setMask,
} from "@/lib/image/editor/masks";
import {
  createPixelLayer,
  drawObject,
  paintPixels,
  settlePixels,
  throughStroke,
  type PaintDraw,
} from "@/lib/image/editor/raster";
import { withOpacity } from "@/lib/image/editor/pixels";
import {
  selectionCanvas,
  type Selection,
} from "@/lib/image/editor/selection-mask";
import { tonedCopy } from "@/lib/image/editor/retouch";
import { cloneStroke, healStroke } from "@/lib/image/editor/stamp";
import {
  BRUSH_TOOLS,
  STAMP_TOOLS,
  type EditorTool,
} from "@/lib/image/editor/shortcuts";
import { brushSoftness, type ToolStyle } from "@/lib/image/editor/tool-style";

interface PaintingState {
  doc: EditorDocument;
  tool: EditorTool;
  style: ToolStyle;
  editingMask: boolean;
  onPainted: () => void;
}

/** Softens a stroke's edge by the brush hardness. */
function soft(draw: PaintDraw, blur: number): PaintDraw {
  return (ctx, base, toPixels) => {
    if (blur > 0) ctx.filter = `blur(${blur}px)`;
    draw(ctx, base, toPixels);
    ctx.filter = "none";
  };
}

/** Lightens or darkens the layer's own pixels under the stroke. */
function toneStroke(path: Path, style: ToolStyle): PaintDraw {
  return throughStroke(path, (ctx, base) => {
    ctx.drawImage(
      tonedCopy(base, {
        strength: style.toneStrength / 100,
        range: style.toneRange,
        burn: style.tone === "burn",
        protectTones: style.protectTones,
      }),
      0,
      0,
    );
  });
}

/**
 * Paints finished brush strokes into the selected layer's pixels, like
 * Photoshop: an image is painted on directly, a shape or text layer is
 * rasterised first, and with nothing selected the brush starts a new layer.
 * The eraser, clone stamp and dodge and burn work the same way. Paint stays
 * inside the selection, and with a mask being edited it lands on the mask.
 * Fabric drops the selection as a stroke begins, so the layer that was
 * selected is noted just before.
 */
export function useEditorPainting(
  canvas: Canvas | null,
  state: PaintingState,
  selection: RefObject<Selection | null>,
) {
  const latest = useRef(state);
  const { clone, marker } = useCloneSource(
    canvas,
    STAMP_TOOLS.has(state.tool),
    state.style.cloneAlign === "aligned",
  );

  useEffect(() => {
    latest.current = state;
  });

  useEffect(() => {
    if (!canvas) return;
    let target: FabricObject | undefined;
    /** An Alt-click only picks the clone source, so the stroke it makes is thrown away. */
    let pickingSource = false;

    const offBefore = canvas.on("mouse:down:before", ({ e }) => {
      if (!canvas.isDrawingMode) return;
      target = singleLayer(canvas.getActiveObject());
      pickingSource = STAMP_TOOLS.has(latest.current.tool) && e.altKey;
    });

    const offCreated = canvas.on("path:created", ({ path }) => {
      canvas.remove(path);
      const { doc, tool, style, editingMask } = latest.current;
      if (!BRUSH_TOOLS.has(tool) || !(path instanceof Path) || pickingSource)
        return;
      const page = { left: 0, top: 0, width: doc.width, height: doc.height };
      const reach = intersectBounds(path.getBoundingRect(), page);
      const current = selection.current;
      const clip = current ? selectionCanvas(current) : null;
      const blur = brushSoftness(style.brushSize, style.brushHardness);
      const erasing = tool === "eraser";
      // Every tool but the brush uses its stroke as a stencil, so only its opacity matters.
      if (tool !== "brush")
        path.set({ stroke: withOpacity("#000000", style.brushOpacity) });

      let draw: PaintDraw = drawObject(path);
      if (STAMP_TOOLS.has(tool)) {
        const { offset } = clone.current;
        if (!offset)
          return void toast("Alt-click to choose where to copy from.");
        const only = style.cloneSample === "layer" ? target : undefined;
        const source = renderDocument(canvas, doc, 1, "", only);
        draw =
          tool === "heal"
            ? healStroke(path, source, offset, only ? null : source)
            : cloneStroke(path, source, offset);
      } else if (tool === "tone") {
        draw = toneStroke(path, style);
      }
      draw = soft(draw, blur);

      const mask = target && editingMask ? getMask(target) : undefined;
      if (target && mask) {
        const { pixels } = paintPixels(
          {
            element: mask,
            matrix: target.calcTransformMatrix(),
            width: target.width,
            height: target.height,
          },
          soft(drawObject(path), blur),
          { erase: erasing, clip },
        );
        const layer = target;
        canvas.setActiveObject(layer);
        // Tells the panels and history the layer changed once its new mask is stored.
        void setMask(layer, pixels).finally(() =>
          canvas.fire("object:modified", { target: layer }),
        );
        return;
      }

      let layer: FabricImage;
      if (target) {
        const found = pixelLayerFor(canvas, target);
        layer = found.layer;
        if (found.rasterised)
          toast(`"${layer.layerName}" was rasterised so it can be painted on.`);
      } else if (tool !== "brush") {
        return void toast("Select a layer to paint on.");
      } else if (reach) {
        layer = createPixelLayer(reach);
        tagLayer(layer, "drawing", "Drawing", canvas.getObjects());
        canvas.add(layer);
      } else {
        return;
      }

      // Only fresh paint grows a layer; erasing or retouching past its edge has nothing to change.
      paintMaskedLayer(layer, draw, {
        reach: tool === "brush" ? reach : null,
        erase: erasing,
        clip,
      });
      canvas.setActiveObject(layer);
      canvas.requestRenderAll();
      void settlePixels(layer)
        .catch(() => undefined)
        .finally(() => {
          canvas.requestRenderAll();
          latest.current.onPainted();
        });
    });

    // Fabric drops the selection on every press, so picking a source keeps the layer chosen.
    const offUp = canvas.on("mouse:up", () => {
      if (!pickingSource || !target) return;
      canvas.setActiveObject(target);
      canvas.requestRenderAll();
    });

    return () => {
      offBefore();
      offCreated();
      offUp();
    };
  }, [canvas, selection, clone]);

  return { cloneMarker: marker };
}

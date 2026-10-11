"use client";

import {
  useEffect,
  useRef,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { type Canvas, type FabricObject, type TPointerEvent } from "fabric";
import { toast } from "sonner";

import { documentPixels, renderDocument } from "@/lib/image/editor/canvas-io";
import {
  intersectBounds,
  type Bounds,
  type EditorDocument,
} from "@/lib/image/editor/document";
import { singleLayer, tagLayer } from "@/lib/image/editor/layers";
import { pixelColour } from "@/lib/image/editor/loupe";
import { paintMaskedLayer, pixelLayerFor } from "@/lib/image/editor/masks";
import {
  dilateMask,
  floodRegion,
  hexToRgba,
  maskBounds,
  paintMask,
  withOpacity,
} from "@/lib/image/editor/pixels";
import {
  createPixelLayer,
  pixelsToCanvas,
  settlePixels,
  type PaintDraw,
} from "@/lib/image/editor/raster";
import {
  selectionCanvas,
  type Selection,
} from "@/lib/image/editor/selection-mask";
import type { Point2D } from "@/lib/image/editor/shapes";
import type { EditorTool } from "@/lib/image/editor/shortcuts";
import type { ToolStyle } from "@/lib/image/editor/tool-style";

interface FillState {
  doc: EditorDocument;
  tool: EditorTool;
  style: ToolStyle;
  setStyle: Dispatch<SetStateAction<ToolStyle>>;
  onPainted: () => void;
}

/** The eyedropper sets the main colour, or the second colour with Alt held. */
function pick(colour: string, secondary: boolean) {
  return (s: ToolStyle): ToolStyle =>
    secondary
      ? { ...s, secondaryColour: colour }
      : { ...s, brushColour: colour, fill: colour };
}

function gradientDraw(
  style: ToolStyle,
  from: Point2D,
  to: Point2D,
  page: Bounds,
): PaintDraw {
  return (ctx) => {
    const gradient =
      style.gradient === "radial"
        ? ctx.createRadialGradient(
            from.x,
            from.y,
            0,
            from.x,
            from.y,
            Math.hypot(to.x - from.x, to.y - from.y),
          )
        : ctx.createLinearGradient(from.x, from.y, to.x, to.y);
    gradient.addColorStop(
      0,
      withOpacity(style.brushColour, style.brushOpacity),
    );
    gradient.addColorStop(
      1,
      withOpacity(style.secondaryColour, style.brushOpacity),
    );
    ctx.fillStyle = gradient;
    ctx.fillRect(page.left, page.top, page.width, page.height);
  };
}

/**
 * How far the fill reaches under the soft edge it stops at, so anti-aliased
 * pixels blend into the fill instead of leaving a halo.
 */
const FILL_SPREAD = 2;

/**
 * The fill bucket, gradient and eyedropper. The bucket floods the colour it
 * is clicked on, as seen across all visible layers, and paints the region
 * into the selected layer (or a new one). A gradient is dragged across the
 * selection, or the whole canvas. Both stay inside the selection.
 */
export function useEditorFill(
  canvas: Canvas | null,
  state: FillState,
  selection: RefObject<Selection | null>,
) {
  const latest = useRef(state);

  useEffect(() => {
    latest.current = state;
  });

  useEffect(() => {
    if (!canvas) return;
    let target: FabricObject | undefined;
    let from: Point2D | null = null;
    let to: Point2D | null = null;
    const scene = (e: TPointerEvent) => canvas.getScenePoint(e);

    /** Paints into the noted layer, or a new one, and records the step. */
    const paint = (
      name: string,
      draw: PaintDraw,
      reach: Bounds,
      behind?: PaintDraw,
    ) => {
      const current = selection.current;
      const layer = target
        ? pixelLayerFor(canvas, target).layer
        : createPixelLayer(reach);
      if (!target) {
        tagLayer(layer, "drawing", name, canvas.getObjects());
        canvas.add(layer);
      }
      paintMaskedLayer(layer, draw, {
        reach,
        behind,
        clip: current ? selectionCanvas(current) : null,
      });
      canvas.setActiveObject(layer);
      canvas.requestRenderAll();
      void settlePixels(layer)
        .catch(() => undefined)
        .finally(() => {
          canvas.requestRenderAll();
          latest.current.onPainted();
        });
    };

    const offBefore = canvas.on("mouse:down:before", () => {
      target = singleLayer(canvas.getActiveObject());
    });

    const offDown = canvas.on("mouse:down", ({ e }) => {
      const { tool, doc, style, setStyle } = latest.current;
      const at = scene(e);

      if (tool === "eyedropper") {
        const pixels = renderDocument(canvas, doc, 1).getContext("2d");
        const colour = pixels && pixelColour(pixels, doc, at);
        if (colour) setStyle(pick(colour, e.altKey));
        return;
      }

      if (tool === "fill") {
        const region = floodRegion(
          documentPixels(canvas, doc),
          at.x,
          at.y,
          style.tolerance,
        );
        if (!region) return;
        const grown = dilateMask(region, doc.width, doc.height, FILL_SPREAD);
        const box = maskBounds(grown, doc.width, doc.height);
        if (!box) return;
        const rgba = hexToRgba(
          style.brushColour,
          Math.round(style.brushOpacity * 2.55),
        );
        const imageOf = (mask: Uint8Array) =>
          pixelsToCanvas(paintMask(mask, rgba), doc.width, doc.height);
        const front = imageOf(region);
        const under = imageOf(grown);
        paint(
          "Fill",
          (ctx) => ctx.drawImage(front, 0, 0),
          box,
          (ctx) => ctx.drawImage(under, 0, 0),
        );
        return;
      }

      if (tool === "gradient") from = at;
    });

    const offMove = canvas.on("mouse:move", ({ e }) => {
      if (!from) return;
      to = scene(e);
      canvas.requestRenderAll();
    });

    const offUp = canvas.on("mouse:up", () => {
      if (!from) return;
      const start = from;
      const end = to;
      from = null;
      to = null;
      canvas.requestRenderAll();
      if (!end || Math.hypot(end.x - start.x, end.y - start.y) < 2) return;
      const { doc, style } = latest.current;
      const page = { left: 0, top: 0, width: doc.width, height: doc.height };
      const current = selection.current;
      const box = current
        ? maskBounds(current.mask, current.width, current.height)
        : page;
      const reach = box && intersectBounds(box, page);
      if (!reach) return void toast("The selection is empty.");
      paint("Gradient", gradientDraw(style, start, end, reach), reach);
    });

    const offRender = canvas.on("after:render", ({ ctx }) => {
      if (ctx !== canvas.getContext() || !from || !to) return;
      const v = canvas.viewportTransform;
      const a = { x: from.x * v[0] + v[4], y: from.y * v[3] + v[5] };
      const b = { x: to.x * v[0] + v[4], y: to.y * v[3] + v[5] };
      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#fff";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.strokeStyle = "#000";
      ctx.lineDashOffset = 4;
      ctx.stroke();
      ctx.restore();
    });

    return () => {
      offBefore();
      offDown();
      offMove();
      offUp();
      offRender();
    };
  }, [canvas, selection]);
}

"use client";

import { useCallback, useState } from "react";
import type { Canvas, FabricImage } from "fabric";
import { toast } from "sonner";

import { singleLayer } from "@/lib/image/editor/layers";
import { pixelLayerFor } from "@/lib/image/editor/masks";
import { readPixels, settlePixels } from "@/lib/image/editor/raster";
import type { LiquifySource } from "@/hooks/use-liquify";

/**
 * Opens Liquify on the selected layer and puts the warped pixels back.
 * A text or shape layer is rasterised first, as painting does.
 */
export function useLayerLiquify(canvas: Canvas | null, commit: () => void) {
  const [layer, setLayer] = useState<FabricImage | null>(null);
  const [source, setSource] = useState<LiquifySource | null>(null);

  const open = useCallback(() => {
    const target = canvas && singleLayer(canvas.getActiveObject());
    if (!canvas || !target) return void toast("Select a layer to liquify.");
    const found = pixelLayerFor(canvas, target);
    if (found.rasterised) {
      toast(
        `"${found.layer.layerName}" was rasterised so it can be liquified.`,
      );
      commit();
    }
    const { width, height } = found.layer;
    setLayer(found.layer);
    setSource({
      pixels: readPixels(found.layer._originalElement, width, height).data,
      width,
      height,
    });
  }, [canvas, commit]);

  const close = useCallback(() => {
    setLayer(null);
    setSource(null);
  }, []);

  const apply = useCallback(
    (warped: HTMLCanvasElement) => {
      if (!canvas || !layer) return;
      layer.setElement(warped);
      layer.setCoords();
      canvas.setActiveObject(layer);
      canvas.requestRenderAll();
      void settlePixels(layer).finally(() => {
        canvas.requestRenderAll();
        commit();
      });
    },
    [canvas, layer, commit],
  );

  return { source, open, close, apply };
}

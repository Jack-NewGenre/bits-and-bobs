/** Putting a document and its layers onto the Fabric canvas. */

import { Rect, type Canvas, type FabricImage } from "fabric";

import { scaleToFit, type EditorDocument } from "@/lib/image/editor/document";
import { applyLock, tagLayer } from "@/lib/image/editor/layers";
import { loadMasks, syncClipPaths } from "@/lib/image/editor/masks";
import type { Scene } from "@/lib/image/editor/project";

/** A rectangle the size of the document; anything outside it is not drawn. */
export function documentClip(doc: EditorDocument): Rect {
  return new Rect({
    left: 0,
    top: 0,
    width: doc.width,
    height: doc.height,
    originX: "left",
    originY: "top",
    absolutePositioned: true,
  });
}

/** Sizes the canvas to the document and paints its background. */
export function applyDocument(canvas: Canvas, doc: EditorDocument) {
  canvas.clipPath = documentClip(doc);
  canvas.backgroundColor = doc.background ?? "";
  canvas.requestRenderAll();
}

/**
 * Rebuilds the layers from a snapshot or a project, masks and all. Fabric drops
 * a layer it cannot decode and carries on, so this rejects afterwards if any
 * were lost, leaving the rest loaded.
 */
export async function loadScene(
  canvas: Canvas,
  scene: Scene,
  signal?: AbortSignal,
) {
  let failed = false;
  // Fabric switches this off for the load and only puts it back on success.
  const { renderOnAddRemove } = canvas;
  try {
    await canvas.loadFromJSON(
      scene,
      (_serialised, _instance, error) => {
        if (error) failed = true;
      },
      { signal },
    );
  } catch (error) {
    canvas.renderOnAddRemove = renderOnAddRemove;
    throw error;
  }
  const objects = canvas.getObjects();
  objects.forEach((object) => applyLock(object, Boolean(object.locked)));
  await loadMasks(objects).catch(() => undefined);
  signal?.throwIfAborted();
  syncClipPaths(canvas);
  if (failed) throw new Error("Some layers could not be loaded.");
}

/** Adds an image as a layer, centred and scaled down to fit the document. */
export function placeImage(
  canvas: Canvas,
  image: FabricImage,
  name: string,
  doc: EditorDocument,
) {
  const scale = scaleToFit(image.width, image.height, doc);
  image.set({
    scaleX: scale,
    scaleY: scale,
    left: doc.width / 2,
    top: doc.height / 2,
  });
  image.setCoords();
  tagLayer(
    image,
    "image",
    name.replace(/\.[^.]+$/, "") || "Image",
    canvas.getObjects(),
  );
  canvas.add(image);
}

/**
 * Layers are the Fabric objects on the canvas, bottom first. The editor tags
 * each one with an id, a name and a kind so the layers panel can list them
 * and the tags survive an undo, which rebuilds every object from JSON.
 */

import { ActiveSelection, FabricImage, FabricObject } from "fabric";

export type LayerKind =
  "image" | "drawing" | "text" | "rect" | "ellipse" | "line" | "polygon";

/** The one layer an action applies to, if exactly one layer is selected. */
export function singleLayer(
  object: FabricObject | undefined,
): FabricObject | undefined {
  return object && !(object instanceof ActiveSelection) && object.layerId
    ? object
    : undefined;
}

export interface LayerSummary {
  id: string;
  name: string;
  kind: LayerKind;
  visible: boolean;
  locked: boolean;
  selected: boolean;
  /** Has a layer mask hiding part of it. */
  masked: boolean;
  /** Shows only where the layer beneath it has pixels. */
  clipped: boolean;
}

export const LAYER_PROPS = [
  "layerId",
  "layerName",
  "layerKind",
  "locked",
  "adjustments",
  "maskSrc",
  "clipped",
  "layerStyles",
];

// Registered once so every toObject() and loadFromJSON() carries the tags.
FabricObject.customProperties = LAYER_PROPS;
// Like Photoshop, a click lands on a pixel layer only where it has pixels, so
// an empty or part-transparent layer never hides the layers beneath it.
FabricImage.ownDefaults.perPixelTargetFind = true;

export const BLEND_MODES: readonly {
  value: GlobalCompositeOperation;
  label: string;
}[] = [
  { value: "source-over", label: "Normal" },
  { value: "multiply", label: "Multiply" },
  { value: "screen", label: "Screen" },
  { value: "overlay", label: "Overlay" },
  { value: "darken", label: "Darken" },
  { value: "lighten", label: "Lighten" },
  { value: "color-dodge", label: "Colour dodge" },
  { value: "color-burn", label: "Colour burn" },
  { value: "hard-light", label: "Hard light" },
  { value: "soft-light", label: "Soft light" },
  { value: "difference", label: "Difference" },
  { value: "exclusion", label: "Exclusion" },
  { value: "hue", label: "Hue" },
  { value: "saturation", label: "Saturation" },
  { value: "color", label: "Colour" },
  { value: "luminosity", label: "Luminosity" },
];

/**
 * The next free name for a layer, numbered the way Photoshop numbers them:
 * "Rectangle", then "Rectangle 2", "Rectangle 3".
 */
export function nextLayerName(
  base: string,
  existing: readonly string[],
): string {
  const taken = new Set(existing);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base} ${n}`)) n += 1;
  return `${base} ${n}`;
}

export function newLayerId(): string {
  return crypto.randomUUID();
}

/** Tags a fresh object as a layer, giving it a unique name among `siblings`. */
export function tagLayer(
  object: FabricObject,
  kind: LayerKind,
  baseName: string,
  siblings: readonly FabricObject[],
): FabricObject {
  object.set({
    layerId: newLayerId(),
    layerKind: kind,
    layerName: nextLayerName(
      baseName,
      siblings.map((sibling) => sibling.layerName ?? ""),
    ),
    locked: false,
  });
  return object;
}

/** Top of the stack first, which is how a layers panel reads. */
export function summariseLayers(
  objects: readonly FabricObject[],
  selected: readonly FabricObject[],
): LayerSummary[] {
  const selectedIds = new Set(selected.map((object) => object.layerId));
  return objects
    .filter((object) => object.layerId)
    .map((object) => ({
      id: object.layerId ?? "",
      name: object.layerName ?? "Layer",
      kind: object.layerKind ?? "image",
      visible: object.visible,
      locked: Boolean(object.locked),
      selected: selectedIds.has(object.layerId),
      masked: Boolean(object.maskSrc),
      clipped: Boolean(object.clipped),
    }))
    .reverse();
}

/** Locking a layer leaves it visible but stops it being picked or moved. */
export function applyLock(object: FabricObject, locked: boolean): void {
  object.set({ locked, selectable: !locked, evented: !locked });
}

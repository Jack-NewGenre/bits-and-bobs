import { describe, expect, it } from "vitest";
import { Rect } from "fabric";

import {
  applyLock,
  nextLayerName,
  summariseLayers,
  tagLayer,
} from "@/lib/image/editor/layers";

describe("editor layers", () => {
  it("numbers repeated names the way Photoshop does", () => {
    expect(nextLayerName("Text", [])).toBe("Text");
    expect(nextLayerName("Text", ["Text"])).toBe("Text 2");
    expect(nextLayerName("Text", ["Text", "Text 2"])).toBe("Text 3");
  });

  it("lists layers top first and marks the selection", () => {
    const bottom = tagLayer(new Rect(), "rect", "Rectangle", []);
    const top = tagLayer(new Rect(), "rect", "Rectangle", [bottom]);
    const summary = summariseLayers([bottom, top], [top]);

    expect(summary.map((layer) => layer.name)).toEqual([
      "Rectangle 2",
      "Rectangle",
    ]);
    expect(summary.map((layer) => layer.selected)).toEqual([true, false]);
  });

  it("carries the layer tags through serialisation", () => {
    const rect = tagLayer(new Rect(), "rect", "Box", []);
    expect(rect.toObject()).toMatchObject({
      layerName: "Box",
      layerKind: "rect",
      locked: false,
    });
  });

  it("stops a locked layer being picked", () => {
    const rect = tagLayer(new Rect(), "rect", "Box", []);
    applyLock(rect, true);
    expect(rect.selectable).toBe(false);
    expect(rect.evented).toBe(false);
  });
});

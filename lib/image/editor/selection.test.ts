import { describe, expect, it } from "vitest";
import { Rect, Textbox } from "fabric";

import { tagLayer } from "@/lib/image/editor/layers";
import {
  applyStyle,
  applyTransform,
  describeSelection,
} from "@/lib/image/editor/selection";

const DOC = { width: 400, height: 200, background: null };

describe("layer selection", () => {
  it("describes a shape's fill, stroke and opacity", () => {
    const rect = tagLayer(
      new Rect({
        fill: "#ff0000",
        stroke: "#00ff00",
        strokeWidth: 3,
        opacity: 0.5,
      }),
      "rect",
      "Box",
      [],
    );
    expect(describeSelection(rect)).toMatchObject({
      name: "Box",
      kind: "rect",
      opacity: 50,
      blend: "source-over",
      fill: "#ff0000",
      stroke: "#00ff00",
      strokeWidth: 3,
    });
  });

  it("only offers font size for text", () => {
    const rect = tagLayer(new Rect(), "rect", "Box", []);
    expect(describeSelection(rect).fontSize).toBeUndefined();
  });

  it("applies a style patch", () => {
    const rect = tagLayer(new Rect(), "rect", "Box", []);
    applyStyle(rect, { opacity: 25, blend: "multiply", fill: "#123456" });
    expect(rect.opacity).toBe(0.25);
    expect(rect.globalCompositeOperation).toBe("multiply");
    expect(rect.fill).toBe("#123456");
  });

  it("rounds a rectangle's corners", () => {
    const rect = tagLayer(new Rect(), "rect", "Box", []);
    applyStyle(rect, { cornerRadius: 8 });
    expect(describeSelection(rect).cornerRadius).toBe(8);
  });

  it("describes and changes text settings", () => {
    const text = new Textbox("Hi", { fontSize: 32 });
    tagLayer(text, "text", "Text", []);
    applyStyle(text, {
      bold: true,
      italic: true,
      align: "center",
      letterSpacing: 100,
      lineHeight: 1.5,
    });
    expect(describeSelection(text).text).toMatchObject({
      bold: true,
      italic: true,
      align: "center",
      letterSpacing: 100,
      lineHeight: 1.5,
    });
    expect(text.fontWeight).toBe("bold");
  });

  it("flips, rotates and centres a layer on the canvas", () => {
    const rect = new Rect({ left: 10, top: 10, width: 20, height: 20 });
    applyTransform(rect, "flip-x", DOC);
    applyTransform(rect, "rotate-ccw", DOC);
    expect(rect.flipX).toBe(true);
    expect(rect.angle).toBe(270);

    applyTransform(rect, "centre", DOC);
    const centre = rect.getCenterPoint();
    expect(centre.x).toBeCloseTo(200);
    expect(centre.y).toBeCloseTo(100);
  });
});

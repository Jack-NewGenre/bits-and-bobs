import { describe, expect, it } from "vitest";

import {
  centredTransform,
  clampZoom,
  fitZoom,
  formatZoom,
  MAX_ZOOM,
  MIN_ZOOM,
  rulerStep,
  stepZoom,
} from "@/lib/image/editor/viewport";

describe("editor viewport", () => {
  it("fits the limiting side inside the padded view", () => {
    expect(fitZoom(1000, 500, 564, 1000, 32)).toBeCloseTo(0.5);
    expect(fitZoom(500, 1000, 1000, 564, 32)).toBeCloseTo(0.5);
  });

  it("keeps zoom within its limits", () => {
    expect(clampZoom(0)).toBe(MIN_ZOOM);
    expect(clampZoom(1000)).toBe(MAX_ZOOM);
  });

  it("steps in and back out to the same zoom", () => {
    expect(stepZoom(stepZoom(1, 1), -1)).toBeCloseTo(1);
  });

  it("centres the document in the view", () => {
    expect(centredTransform(2, 100, 50, 400, 300)).toEqual([
      2, 0, 0, 2, 100, 100,
    ]);
  });

  it("centres in the part of the view not covered by panels", () => {
    const insets = { top: 0, right: 200, bottom: 100, left: 0 };
    expect(centredTransform(1, 100, 100, 500, 400, insets)).toEqual([
      1, 0, 0, 1, 100, 100,
    ]);
  });

  it("formats zoom as a percentage", () => {
    expect(formatZoom(0.254)).toBe("25%");
  });
});

describe("rulerStep", () => {
  it("spaces labels at a round interval that suits the zoom", () => {
    expect(rulerStep(1)).toBe(100);
    expect(rulerStep(0.5)).toBe(200);
    expect(rulerStep(0.1)).toBe(1000);
    expect(rulerStep(8)).toBe(10);
  });
});

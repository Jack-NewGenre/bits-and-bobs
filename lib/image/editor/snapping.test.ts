import { describe, expect, it } from "vitest";

import { snapBox, snapLines } from "@/lib/image/editor/snapping";

const DOC = { width: 200, height: 100 };

describe("smart guides", () => {
  it("collects the canvas and layer edges and centres", () => {
    const lines = snapLines(DOC, [
      { left: 10, top: 20, width: 30, height: 40 },
    ]);
    expect(lines.x).toEqual([0, 100, 200, 10, 25, 40]);
    expect(lines.y).toEqual([0, 50, 100, 20, 40, 60]);
  });

  it("pulls a box onto the canvas centre", () => {
    const snap = snapBox(
      { left: 77, top: 5, width: 50, height: 10 },
      snapLines(DOC, []),
      6,
    );
    expect(snap.dx).toBe(-2);
    expect(snap.guides).toContainEqual({ axis: "x", at: 100 });
  });

  it("picks the closest line on each axis", () => {
    const snap = snapBox(
      { left: 3, top: 47, width: 20, height: 20 },
      snapLines(DOC, []),
      6,
    );
    expect(snap).toEqual({
      dx: -3,
      dy: 3,
      guides: [
        { axis: "x", at: 0 },
        { axis: "y", at: 50 },
      ],
    });
  });

  it("leaves a box alone when nothing is close", () => {
    expect(
      snapBox(
        { left: 30, top: 30, width: 10, height: 10 },
        snapLines(DOC, []),
        2,
      ),
    ).toEqual({
      dx: 0,
      dy: 0,
      guides: [],
    });
  });
});

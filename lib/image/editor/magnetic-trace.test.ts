import { describe, expect, it } from "vitest";

import { edgeCost } from "@/lib/image/editor/magnetic";
import {
  addAnchor,
  closeTrace,
  moveTrace,
  removeAnchor,
  startTrace,
  tracePoints,
  type EdgeMap,
} from "@/lib/image/editor/magnetic-trace";

/** A dark square on a light ground, so its outline is the only edge. */
function squareMap(size = 120, from = 30, to = 90): EdgeMap {
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let y = from; y < to; y++)
    for (let x = from; x < to; x++)
      data.set([20, 20, 20, 255], (y * size + x) * 4);
  return {
    cost: edgeCost({ data, width: size, height: size }),
    width: size,
    height: size,
  };
}

describe("magnetic trace", () => {
  const map = squareMap();

  it("starts on the nearest edge", () => {
    const trace = startTrace(map, { x: 33, y: 60 });
    expect(Math.abs(trace.segments[0][0].x - 30)).toBeLessThanOrEqual(1);
  });

  it("fixes points by itself as the wire grows", () => {
    let trace = startTrace(map, { x: 30, y: 30 });
    trace = moveTrace(map, trace, { x: 30, y: 89 });
    expect(trace.segments.length).toBeGreaterThan(1);
    const points = tracePoints(trace);
    expect(points[0]).toEqual(trace.segments[0][0]);
    expect(points[points.length - 1]).toEqual(
      trace.live[trace.live.length - 1],
    );
  });

  it("adds and removes anchors", () => {
    let trace = startTrace(map, { x: 30, y: 30 });
    trace = addAnchor(moveTrace(map, trace, { x: 30, y: 50 }));
    expect(trace.segments).toHaveLength(2);
    const back = removeAnchor(trace);
    expect(back?.segments).toHaveLength(1);
    expect(back && removeAnchor(back)).toBeNull();
  });

  it("closes back to where it started", () => {
    let trace = startTrace(map, { x: 30, y: 30 });
    trace = addAnchor(moveTrace(map, trace, { x: 89, y: 30 }));
    trace = moveTrace(map, trace, { x: 89, y: 89 });
    const closed = closeTrace(map, trace);
    expect(closed[closed.length - 1]).toEqual(closed[0]);
  });
});

/**
 * A magnetic lasso trace in progress: fixed anchors joined by edge-hugging
 * wires, plus a live wire to the pointer. Like Photoshop, a point is fixed
 * automatically whenever the live wire grows past `ANCHOR_SPACING`.
 */

import { anchorIndex, liveWire, snapToEdge } from "@/lib/image/editor/magnetic";
import type { Point2D } from "@/lib/image/editor/shapes";

/** Path length, in document pixels, after which a point is fixed for you. */
export const ANCHOR_SPACING = 40;
/** How far, in document pixels, the pointer reaches to cling to an edge. */
export const SNAP_RADIUS = 6;

export interface EdgeMap {
  cost: Float32Array;
  width: number;
  height: number;
}

export interface MagneticTrace {
  /** Each fixed anchor with the wire that led to it (the first anchor's wire is just itself). */
  segments: Point2D[][];
  /** From the last anchor to the pointer. */
  live: Point2D[];
}

function lastAnchor(trace: MagneticTrace): Point2D {
  const wire = trace.segments[trace.segments.length - 1];
  return wire[wire.length - 1];
}

export function startTrace(map: EdgeMap, at: Point2D): MagneticTrace {
  const anchor = snapToEdge(map.cost, map.width, map.height, at, SNAP_RADIUS);
  return { segments: [[anchor]], live: [anchor] };
}

/** Rewires the live wire to the pointer, fixing points along it as it grows. */
export function moveTrace(
  map: EdgeMap,
  trace: MagneticTrace,
  at: Point2D,
): MagneticTrace {
  const to = snapToEdge(map.cost, map.width, map.height, at, SNAP_RADIUS);
  let segments = trace.segments;
  let live = liveWire(map.cost, map.width, map.height, lastAnchor(trace), to);
  for (let index = anchorIndex(live, ANCHOR_SPACING); index > 0;) {
    segments = [...segments, live.slice(0, index + 1)];
    live = live.slice(index);
    index = anchorIndex(live, ANCHOR_SPACING);
  }
  return { segments, live };
}

/** Fixes the live wire's end as an anchor, as a click does. */
export function addAnchor(trace: MagneticTrace): MagneticTrace {
  if (trace.live.length < 2) return trace;
  return {
    segments: [...trace.segments, trace.live],
    live: trace.live.slice(-1),
  };
}

/** Drops the last anchor, as Backspace does. Null once nothing is left. */
export function removeAnchor(trace: MagneticTrace): MagneticTrace | null {
  if (trace.segments.length <= 1) return null;
  const segments = trace.segments.slice(0, -1);
  const wire = segments[segments.length - 1];
  return { segments, live: wire.slice(-1) };
}

/** Every point of the trace in order, ready to draw or to close into a lasso. */
export function tracePoints(trace: MagneticTrace): Point2D[] {
  return [
    ...trace.segments.flatMap((wire, index) =>
      index > 0 ? wire.slice(1) : wire,
    ),
    ...trace.live.slice(1),
  ];
}

/** Closes the trace with a wire back to where it started. */
export function closeTrace(map: EdgeMap, trace: MagneticTrace): Point2D[] {
  const start = trace.segments[0][0];
  const back = liveWire(
    map.cost,
    map.width,
    map.height,
    trace.live[trace.live.length - 1],
    start,
  );
  return [...tracePoints(trace), ...back.slice(1)];
}

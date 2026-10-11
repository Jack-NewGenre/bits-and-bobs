"use client";

import { useRef, useState } from "react";

import {
  curveSpline,
  evaluateSpline,
  MAX_CURVE_POINTS,
} from "@/lib/image/editor/curves";
import type { Point2D } from "@/lib/image/editor/shapes";

const SIZE = 100;
const SAMPLES = 64;
const GRID = [25, 50, 75];

interface CurveEditorProps {
  points: Point2D[];
  onChange: (points: Point2D[]) => void;
}

/**
 * The tone curve as a square graph. Drag a point to bend the curve, click the
 * graph to add one, double-click a middle point to remove it.
 */
export function CurveEditor({ points, onChange }: CurveEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const spline = curveSpline(points);
  const path = Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const x = i / SAMPLES;
    return `${i === 0 ? "M" : "L"}${x * SIZE},${(1 - evaluateSpline(spline, x)) * SIZE}`;
  }).join(" ");

  const toCurve = (event: React.PointerEvent): Point2D => {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    return {
      x: clamp((event.clientX - box.left) / box.width),
      y: clamp(1 - (event.clientY - box.top) / box.height),
    };
  };

  const startDrag = (event: React.PointerEvent, index: number) => {
    event.stopPropagation();
    svgRef.current?.setPointerCapture(event.pointerId);
    setDragging(index);
  };

  const addPoint = (event: React.PointerEvent<SVGSVGElement>) => {
    if (points.length >= MAX_CURVE_POINTS) return;
    const point = toCurve(event);
    const next = [...points, point].sort((a, b) => a.x - b.x);
    onChange(next);
    startDrag(event, next.indexOf(point));
  };

  const movePoint = (event: React.PointerEvent) => {
    if (dragging === null) return;
    const { x, y } = toCurve(event);
    const gap = 0.01;
    const left = dragging === 0 ? 0 : points[dragging - 1].x + gap;
    const right =
      dragging === points.length - 1 ? 1 : points[dragging + 1].x - gap;
    onChange(
      points.map((point, i) =>
        i === dragging ? { x: Math.min(right, Math.max(left, x)), y } : point,
      ),
    );
  };

  const removePoint = (index: number) => {
    if (index === 0 || index === points.length - 1) return;
    onChange(points.filter((_, i) => i !== index));
  };

  return (
    <svg
      ref={svgRef}
      role="img"
      aria-label="Tone curve"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="bg-muted/40 border-border aspect-square w-full touch-none rounded-md border"
      onPointerDown={addPoint}
      onPointerMove={movePoint}
      onPointerUp={() => setDragging(null)}
      onPointerCancel={() => setDragging(null)}
    >
      {GRID.map((at) => (
        <g key={at} className="stroke-border" strokeWidth={0.4}>
          <line x1={at} y1={0} x2={at} y2={SIZE} />
          <line x1={0} y1={at} x2={SIZE} y2={at} />
        </g>
      ))}
      <line
        x1={0}
        y1={SIZE}
        x2={SIZE}
        y2={0}
        className="stroke-muted-foreground"
        strokeWidth={0.4}
        strokeDasharray="2 2"
      />
      <path
        d={path}
        fill="none"
        className="stroke-foreground"
        strokeWidth={1.2}
      />
      {points.map((point, i) => (
        <circle
          key={i}
          cx={point.x * SIZE}
          cy={(1 - point.y) * SIZE}
          r={dragging === i ? 3.2 : 2.6}
          className="fill-background stroke-foreground cursor-grab"
          strokeWidth={1}
          onPointerDown={(event) => startDrag(event, i)}
          onDoubleClick={() => removePoint(i)}
        />
      ))}
    </svg>
  );
}

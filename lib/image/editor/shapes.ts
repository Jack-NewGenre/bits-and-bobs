/** Building the drawn primitives: rectangles, ellipses, lines, polygons and text. */

import {
  Ellipse,
  Line,
  Polygon,
  Rect,
  Textbox,
  type FabricObject,
} from "fabric";

import type { LayerKind } from "@/lib/image/editor/layers";
import { DEFAULT_FONT } from "@/lib/image/editor/text";

export type ShapeKind =
  "rect" | "ellipse" | "line" | "triangle" | "polygon" | "star" | "arrow";

export const SHAPE_KINDS: readonly ShapeKind[] = [
  "rect",
  "ellipse",
  "line",
  "triangle",
  "polygon",
  "star",
  "arrow",
];

export interface ShapeStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  /** Rounded corners for rectangles. */
  cornerRadius: number;
  /** Corners of a polygon, or points of a star. */
  sides: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface DragBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Below this size a drag counts as a click, and a default-sized shape is used. */
export const MIN_DRAG = 4;
export const DEFAULT_SHAPE_SIZE = 160;
export const MIN_SIDES = 3;
export const MAX_SIDES = 12;

/**
 * The box between where a drag started and where it is now, whichever way
 * it went. Holding shift makes it square, as it does everywhere else.
 */
export function dragBounds(
  start: Point2D,
  end: Point2D,
  square = false,
): DragBounds {
  let dx = end.x - start.x;
  let dy = end.y - start.y;
  if (square) {
    const side = Math.max(Math.abs(dx), Math.abs(dy));
    dx = Math.sign(dx || 1) * side;
    dy = Math.sign(dy || 1) * side;
  }
  return {
    left: Math.min(start.x, start.x + dx),
    top: Math.min(start.y, start.y + dy),
    width: Math.abs(dx),
    height: Math.abs(dy),
  };
}

/** The shape's name as it appears in the layers list. */
export const SHAPE_NAMES: Record<ShapeKind, string> = {
  rect: "Rectangle",
  ellipse: "Ellipse",
  line: "Line",
  triangle: "Triangle",
  polygon: "Polygon",
  star: "Star",
  arrow: "Arrow",
};

/** The layer kind a shape is listed as; every outline shape is a polygon. */
export function shapeLayerKind(kind: ShapeKind): LayerKind {
  return kind === "rect" || kind === "ellipse" || kind === "line"
    ? kind
    : "polygon";
}

/** Points round an ellipse filling `bounds`, starting at the top. */
function ring(
  bounds: DragBounds,
  count: number,
  radius = 1,
  offset = 0,
): Point2D[] {
  const cx = bounds.left + bounds.width / 2;
  const cy = bounds.top + bounds.height / 2;
  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + ((i + offset) * 2 * Math.PI) / count;
    return {
      x: cx + (Math.cos(angle) * bounds.width * radius) / 2,
      y: cy + (Math.sin(angle) * bounds.height * radius) / 2,
    };
  });
}

/** The corners of an outline shape drawn into `bounds`. */
export function shapePoints(
  kind: ShapeKind,
  bounds: DragBounds,
  sides: number,
): Point2D[] {
  const { left, top, width, height } = bounds;
  const count = Math.min(MAX_SIDES, Math.max(MIN_SIDES, Math.round(sides)));
  if (kind === "triangle") {
    return [
      { x: left + width / 2, y: top },
      { x: left + width, y: top + height },
      { x: left, y: top + height },
    ];
  }
  if (kind === "star") {
    const outer = ring(bounds, count);
    const inner = ring(bounds, count, 0.45, 0.5);
    return outer.flatMap((point, i) => [point, inner[i]]);
  }
  if (kind === "arrow") {
    const shaft = top + height * 0.3;
    const shaftEnd = top + height * 0.7;
    const neck = left + width * 0.6;
    return [
      { x: left, y: shaft },
      { x: neck, y: shaft },
      { x: neck, y: top },
      { x: left + width, y: top + height / 2 },
      { x: neck, y: top + height },
      { x: neck, y: shaftEnd },
      { x: left, y: shaftEnd },
    ];
  }
  return ring(bounds, count);
}

const TOP_LEFT = { originX: "left", originY: "top" } as const;

export function createShape(
  kind: ShapeKind,
  bounds: DragBounds,
  style: ShapeStyle,
): FabricObject {
  const { left, top, width, height } = bounds;
  if (kind === "line") {
    return new Line([left, top, left + width, top + height], {
      stroke: style.stroke,
      strokeWidth: Math.max(1, style.strokeWidth),
      strokeLineCap: "round",
    });
  }
  const common = {
    ...TOP_LEFT,
    left,
    top,
    fill: style.fill,
    stroke: style.stroke,
    strokeWidth: style.strokeWidth,
    strokeUniform: true,
  };
  if (kind === "rect") {
    return new Rect({
      ...common,
      width,
      height,
      rx: style.cornerRadius,
      ry: style.cornerRadius,
    });
  }
  if (kind === "ellipse")
    return new Ellipse({ ...common, rx: width / 2, ry: height / 2 });
  return new Polygon(shapePoints(kind, bounds, style.sides), {
    ...common,
    strokeLineJoin: "round",
  });
}

/** Resizes a shape that is still being dragged out. */
export function resizeShape(
  shape: FabricObject,
  kind: ShapeKind,
  start: Point2D,
  bounds: DragBounds,
  end: Point2D,
  sides: number,
): void {
  if (kind === "line" && shape instanceof Line) {
    shape.set({ x1: start.x, y1: start.y, x2: end.x, y2: end.y });
  } else if (shape instanceof Ellipse) {
    shape.set({
      left: bounds.left,
      top: bounds.top,
      rx: bounds.width / 2,
      ry: bounds.height / 2,
    });
  } else if (shape instanceof Polygon) {
    shape.set({ points: shapePoints(kind, bounds, sides) });
    shape.setBoundingBox(true);
  } else {
    shape.set({ ...bounds });
  }
  shape.setCoords();
}

export function createText(
  at: Point2D,
  fill: string,
  fontSize: number,
  fontFamily = DEFAULT_FONT,
): Textbox {
  return new Textbox("Text", {
    ...TOP_LEFT,
    left: at.x,
    top: at.y,
    width: Math.max(120, fontSize * 6),
    fill,
    fontSize,
    fontFamily,
  });
}

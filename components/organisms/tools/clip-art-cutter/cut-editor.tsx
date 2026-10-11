"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import type { CutRegions } from "@/hooks/use-cut-regions";
import {
  isUsableRect,
  moveRect,
  rectFromPoints,
  resizeRect,
  type Point,
  type Rect,
} from "@/lib/image/cut-rect";
import {
  addLassoPoint,
  cutFromLasso,
  svgPoints,
  type Cut,
} from "@/lib/image/lasso";
import type { Bounds, Corner } from "@/lib/image/square-crop";
import { OptionGroup } from "@/components/molecules/option-group";
import { CutBox } from "@/components/organisms/tools/clip-art-cutter/cut-box";

interface CutEditorProps {
  src: string;
  bounds: Bounds;
  cuts: CutRegions;
}

type DrawMode = "lasso" | "box";

type Drag =
  | { kind: "draw"; anchor: Point }
  | { kind: "lasso" }
  | { kind: "edit"; id: number; corner?: Corner; origin: Point; start: Cut };

const MODES = [
  { value: "lasso", label: "Lasso" },
  { value: "box", label: "Box" },
] as const;

const HINTS: Record<DrawMode, { frame: string; help: string }> = {
  lasso: {
    frame: "Image. Drag round a piece to lasso it.",
    help: "Hold and drag round a piece to cut it out; let go to close the shape. Drag a cut to move it, or select it and press Delete to remove it.",
  },
  box: {
    frame: "Image. Drag to draw a box around a piece.",
    help: "Drag on the image to draw a box around a piece. Drag a box to move it, or a corner to resize it. Select a box and press Delete to remove it.",
  },
};

/**
 * The source image with every piece being cut out drawn over it. Draw a
 * freehand lasso or a box; drag a cut to move it, or a box's corners to resize
 * it. A selected cut also takes the arrow keys (Shift for bigger steps) and Delete.
 */
export function CutEditor({ src, bounds, cuts }: CutEditorProps) {
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [mode, setMode] = useState<DrawMode>("lasso");
  const [draft, setDraft] = useState<Rect | null>(null);
  const [trail, setTrail] = useState<Point[] | null>(null);

  /** Where the pointer is, in source pixels. */
  const toImage = (event: PointerEvent<HTMLElement>): Point => {
    const box = frame.current?.getBoundingClientRect();
    if (!box?.width || !box.height) return { x: 0, y: 0 };
    return {
      x: ((event.clientX - box.left) / box.width) * bounds.width,
      y: ((event.clientY - box.top) / box.height) * bounds.height,
    };
  };

  const capture = (event: PointerEvent<HTMLElement>) => {
    event.preventDefault();
    frame.current?.setPointerCapture(event.pointerId);
  };

  const beginDraw = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    capture(event);
    cuts.select(null);
    if (mode === "box") {
      drag.current = { kind: "draw", anchor: toImage(event) };
      return;
    }
    drag.current = { kind: "lasso" };
    setTrail(addLassoPoint([], toImage(event), bounds));
  };

  const beginEdit =
    (id: number, rect: Cut) =>
    (event: PointerEvent<HTMLElement>, corner?: Corner) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      capture(event);
      drag.current = {
        kind: "edit",
        id,
        corner,
        origin: toImage(event),
        start: rect,
      };
      cuts.select(id);
    };

  const track = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current) return;
    const point = toImage(event);
    if (current.kind === "draw") {
      setDraft(rectFromPoints(current.anchor, point, bounds));
      return;
    }
    if (current.kind === "lasso") {
      setTrail((points) => points && addLassoPoint(points, point, bounds));
      return;
    }
    const [dx, dy] = [point.x - current.origin.x, point.y - current.origin.y];
    cuts.update(
      current.id,
      current.corner
        ? resizeRect(current.start, current.corner, dx, dy, bounds)
        : moveRect(current.start, dx, dy, bounds),
    );
  };

  const end = () => {
    if (drag.current?.kind === "draw" && draft && isUsableRect(draft))
      cuts.add(draft);
    const lassoed =
      drag.current?.kind === "lasso" && trail && cutFromLasso(trail);
    if (lassoed) cuts.add(lassoed);
    drag.current = null;
    setDraft(null);
    setTrail(null);
  };

  const keys =
    (id: number, rect: Cut) => (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        cuts.remove(id);
        frame.current?.focus();
        return;
      }
      const step =
        Math.max(1, Math.round(Math.max(bounds.width, bounds.height) / 100)) *
        (event.shiftKey ? 10 : 1);
      const delta: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const move = delta[event.key];
      if (!move) return;
      event.preventDefault();
      cuts.update(id, moveRect(rect, ...move, bounds));
    };

  return (
    <div className="space-y-4">
      <OptionGroup
        label="Draw with"
        choices={MODES}
        value={mode}
        onChange={setMode}
      />
      <div
        ref={frame}
        tabIndex={-1}
        aria-label={HINTS[mode].frame}
        style={{ aspectRatio: `${bounds.width} / ${bounds.height}` }}
        className="bg-checkerboard relative w-full cursor-crosshair touch-none overflow-hidden rounded-lg outline-none select-none"
        onPointerDown={beginDraw}
        onPointerMove={track}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          className="pointer-events-none size-full object-fill"
        />
        {cuts.regions.map((region, index) => (
          <CutBox
            key={region.id}
            rect={region}
            bounds={bounds}
            number={index + 1}
            selected={region.id === cuts.selectedId}
            onPointerDown={beginEdit(region.id, region)}
            onKeyDown={keys(region.id, region)}
          />
        ))}
        {draft && (
          <CutBox
            rect={draft}
            bounds={bounds}
            number={cuts.regions.length + 1}
            selected
            draft
          />
        )}
        {trail && (
          <svg
            viewBox={`0 0 ${bounds.width} ${bounds.height}`}
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 size-full"
          >
            <polyline
              points={svgPoints(trail)}
              vectorEffect="non-scaling-stroke"
              className="stroke-primary fill-primary/10 stroke-2 [stroke-dasharray:6_4]"
            />
          </svg>
        )}
      </div>
      <p className="text-muted-foreground text-xs">{HINTS[mode].help}</p>
    </div>
  );
}

export type { CutEditorProps };

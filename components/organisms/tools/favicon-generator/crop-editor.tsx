"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";

import { CornerHandle } from "@/components/atoms/corner-handle";
import {
  CORNERS,
  moveCrop,
  resizeCrop,
  type Bounds,
  type Corner,
  type SquareCrop,
} from "@/lib/image/square-crop";
import type { Rgb } from "@/lib/colour/colour";
import { formatRgb } from "@/lib/colour/colour-format";
import { cn } from "@/lib/utils";

interface CropEditorProps {
  src: string;
  bounds: Bounds;
  crop: SquareCrop;
  /** Corner radius as a percentage of the side, previewed on the box. */
  radius: number;
  /** Fill previewed behind the image, so transparent areas show what they will become. */
  background?: Rgb;
  onChange: (crop: SquareCrop) => void;
}

interface Drag {
  corner?: Corner;
  startX: number;
  startY: number;
  start: SquareCrop;
  /** Source pixels per screen pixel, fixed for the length of the drag. */
  scale: number;
}

const percent = (value: number, of: number) => `${(value / of) * 100}%`;

/**
 * The source image with a square crop over it. Drag inside the box to move
 * it, drag a corner to resize it, or use the arrow keys (Shift for bigger
 * steps). Everything outside the box is dimmed.
 */
export function CropEditor({
  src,
  bounds,
  crop,
  radius,
  background,
  onChange,
}: CropEditorProps) {
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);

  const begin = (event: PointerEvent<HTMLElement>, corner?: Corner) => {
    if (!frame.current) return;
    event.preventDefault();
    event.stopPropagation();
    frame.current.setPointerCapture(event.pointerId);
    drag.current = {
      corner,
      startX: event.clientX,
      startY: event.clientY,
      start: crop,
      scale: bounds.width / frame.current.clientWidth,
    };
  };

  const track = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current) return;
    const dx = (event.clientX - current.startX) * current.scale;
    const dy = (event.clientY - current.startY) * current.scale;
    onChange(
      current.corner
        ? resizeCrop(current.start, current.corner, dx, dy, bounds)
        : moveCrop(current.start, dx, dy, bounds),
    );
  };

  const end = () => {
    drag.current = null;
  };

  const nudge = (event: KeyboardEvent<HTMLDivElement>) => {
    const step =
      (Math.max(bounds.width, bounds.height) / 100) * (event.shiftKey ? 10 : 1);
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = delta[event.key];
    if (!move) return;
    event.preventDefault();
    onChange(moveCrop(crop, ...move, bounds));
  };

  const rounding = `${radius}%`;

  return (
    <div
      ref={frame}
      style={{
        aspectRatio: `${bounds.width} / ${bounds.height}`,
        backgroundColor: background && formatRgb(background),
      }}
      className={cn(
        "relative w-full touch-none overflow-hidden rounded-lg select-none",
        !background && "bg-checkerboard",
      )}
      onPointerMove={track}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        className="size-full object-fill"
      />

      <div
        role="group"
        tabIndex={0}
        aria-roledescription="crop area"
        aria-label={`${Math.round(crop.side)} pixel square at ${Math.round(crop.x)}, ${Math.round(crop.y)}. Drag to move, arrow keys to nudge.`}
        onPointerDown={(event) => begin(event)}
        onKeyDown={nudge}
        style={{
          left: percent(crop.x, bounds.width),
          top: percent(crop.y, bounds.height),
          width: percent(crop.side, bounds.width),
          height: percent(crop.side, bounds.height),
        }}
        className="focus-visible:ring-ring/50 absolute cursor-move outline-none focus-visible:ring-3"
      >
        {/* The outward shadow dims everything outside the crop in one layer. */}
        <div
          style={{ borderRadius: rounding }}
          className="pointer-events-none absolute inset-0 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"
        />
        <div className="border-primary pointer-events-none absolute inset-0 border-2 border-dashed" />
        {CORNERS.map((corner) => (
          <CornerHandle
            key={corner}
            corner={corner}
            onPointerDown={(event) => begin(event, corner)}
          />
        ))}
      </div>
    </div>
  );
}

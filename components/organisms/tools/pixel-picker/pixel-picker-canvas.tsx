"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

import { formatHex } from "@/lib/colour/colour-format";
import { loupeGrid, type PixelSource } from "@/lib/image/pixel-sample";
import { cn } from "@/lib/utils";

interface Point {
  x: number;
  y: number;
}

interface PixelPickerCanvasProps {
  source: PixelSource & { bitmap: ImageBitmap };
  /** Called with image coordinates as the cursor moves. */
  onHover: (point: Point) => void;
  /** Called with image coordinates when a pixel is chosen. */
  onPick: (point: Point) => void;
}

const LOUPE_CELLS = 11;

const ARROW_STEPS: Record<string, Point> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

/**
 * The image at full resolution, scaled to fit, with a magnifying loupe that
 * follows the cursor. Arrow keys move one pixel, Shift moves ten, Enter picks.
 */
export function PixelPickerCanvas({
  source,
  onHover,
  onPick,
}: PixelPickerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cursor, setCursor] = useState<Point | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = source.width;
    canvas.height = source.height;
    canvas.getContext("2d")?.drawImage(source.bitmap, 0, 0);
  }, [source]);

  const moveTo = (point: Point) => {
    const clamped = {
      x: Math.min(Math.max(Math.floor(point.x), 0), source.width - 1),
      y: Math.min(Math.max(Math.floor(point.y), 0), source.height - 1),
    };
    setCursor(clamped);
    onHover(clamped);
    return clamped;
  };

  /**
   * Maps the pointer onto the drawn image, allowing for the border and the
   * empty bands `object-contain` leaves around a tall image. `null` off the image.
   */
  const toImagePoint = (event: MouseEvent<HTMLCanvasElement>): Point | null => {
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    const { clientWidth, clientHeight } = element;
    const scale = Math.min(
      clientWidth / source.width,
      clientHeight / source.height,
    );
    const left =
      rect.left + element.clientLeft + (clientWidth - source.width * scale) / 2;
    const top =
      rect.top + element.clientTop + (clientHeight - source.height * scale) / 2;
    const x = (event.clientX - left) / scale;
    const y = (event.clientY - top) / scale;
    return x >= 0 && y >= 0 && x < source.width && y < source.height
      ? { x, y }
      : null;
  };

  const handlePointer = (event: MouseEvent<HTMLCanvasElement>) => {
    const point = toImagePoint(event);
    if (!point) setCursor(null);
    return point && moveTo(point);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const current = cursor ?? { x: source.width / 2, y: source.height / 2 };
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onPick(moveTo(current));
      return;
    }
    const step = ARROW_STEPS[event.key];
    if (!step) return;
    event.preventDefault();
    const distance = event.shiftKey ? 10 : 1;
    moveTo({
      x: current.x + step.x * distance,
      y: current.y + step.y * distance,
    });
  };

  const grid = cursor ? loupeGrid(source, cursor.x, cursor.y, LOUPE_CELLS) : [];
  const centre = Math.floor((LOUPE_CELLS * LOUPE_CELLS) / 2);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        aria-label="Image. Move with the arrow keys and press Enter to pick a colour."
        className="focus-visible:ring-ring/50 block h-auto max-h-[70vh] w-full cursor-crosshair rounded-lg border object-contain outline-none focus-visible:ring-3"
        onPointerMove={handlePointer}
        onPointerLeave={() => setCursor(null)}
        onClick={(event) => {
          const point = handlePointer(event);
          if (point) onPick(point);
        }}
        onKeyDown={handleKeyDown}
      />

      {cursor && (
        <div
          aria-hidden
          className="bg-background pointer-events-none absolute top-3 right-3 grid size-33 overflow-hidden rounded-full border-2 shadow-lg"
          style={{
            gridTemplateColumns: `repeat(${LOUPE_CELLS}, minmax(0, 1fr))`,
          }}
        >
          {grid.map((colour, index) => (
            <div
              key={index}
              className={cn(
                index === centre && "ring-foreground z-10 ring-2 ring-inset",
              )}
              style={{ backgroundColor: formatHex(colour) }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export type { PixelPickerCanvasProps, Point };

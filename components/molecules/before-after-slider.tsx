"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/** Arrow-key step, in percent. Shift/Page keys move a larger jump. */
const STEP = 2;
const LARGE_STEP = 10;

interface BeforeAfterSliderProps {
  beforeUrl: string;
  afterUrl: string;
  /** Label shown on the "before" (original) side. */
  beforeLabel?: string;
  /** Label shown on the "after" (processed) side. */
  afterLabel?: string;
  /** Render a checkerboard behind the images (for transparent results). */
  showCheckerboard?: boolean;
  /** Magnify both images so fine differences (e.g. sharpening) are visible. */
  zoom?: number;
  /** Dim the preview while a newer result is still being processed. */
  isStale?: boolean;
  className?: string;
}

export function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
  beforeLabel = "Original",
  afterLabel = "After",
  showCheckerboard = false,
  zoom = 1,
  isStale = false,
  className,
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  // The container cannot move or resize mid-drag, so its box is measured once
  // on pointer down. Measuring inside the move handler would force a reflow on
  // every event, because the previous event just changed the layout.
  const rectRef = useRef<DOMRect>(null);
  const frameRef = useRef(0);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  // At high zoom, smoothing hides the very detail the user zoomed in to judge.
  const imgStyle: React.CSSProperties | undefined =
    zoom === 1
      ? undefined
      : { transform: `scale(${zoom})`, imageRendering: "pixelated" };

  const clampPosition = (value: number) => Math.min(100, Math.max(0, value));

  const updateFromClientX = useCallback((clientX: number) => {
    const rect = rectRef.current;
    if (!rect || rect.width === 0) return;
    setPosition(clampPosition(((clientX - rect.left) / rect.width) * 100));
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    rectRef.current = event.currentTarget.getBoundingClientRect();
    updateFromClientX(event.clientX);
  };

  // Pointers fire far faster than the screen refreshes, so the moves are
  // coalesced into one state write per frame. Everything in between would be
  // painted over before it was ever seen.
  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.buttons !== 1) return;
    rectRef.current ??= event.currentTarget.getBoundingClientRect();
    const { clientX } = event;
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => updateFromClientX(clientX));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? LARGE_STEP : STEP;
    const moves: Record<string, number> = {
      ArrowLeft: -step,
      ArrowRight: step,
      PageDown: -LARGE_STEP,
      PageUp: LARGE_STEP,
    };

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setPosition(event.key === "Home" ? 0 : 100);
      return;
    }

    const delta = moves[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    setPosition((previous) => clampPosition(previous + delta));
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      className={cn(
        "relative aspect-video w-full touch-none overflow-hidden rounded-lg select-none",
        "transition-opacity",
        isStale && "opacity-60",
        showCheckerboard ? "bg-checkerboard" : "bg-muted",
        className,
      )}
    >
      {/* After (processed) fills the base layer. */}
      <img
        src={afterUrl}
        alt={afterLabel}
        className="absolute inset-0 size-full object-contain"
        style={imgStyle}
        draggable={false}
      />
      {/* Before (original) clipped to the left of the handle. It needs its own
          opaque backing so the "after" layer cannot show through it, but for
          a transparent image that backing must be the same checkerboard, or
          the original reads as a solid dark panel rather than see-through. */}
      <div
        className={cn(
          "absolute inset-0 overflow-hidden",
          showCheckerboard ? "bg-checkerboard" : "bg-background",
        )}
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img
          src={beforeUrl}
          alt={beforeLabel}
          className="absolute inset-0 size-full object-contain"
          style={imgStyle}
          draggable={false}
        />
      </div>

      <div
        role="slider"
        tabIndex={0}
        aria-label={`Reveal ${beforeLabel} over ${afterLabel}`}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        aria-valuetext={`${Math.round(position)}% ${beforeLabel}`}
        onKeyDown={handleKeyDown}
        className="bg-background focus-visible:ring-ring absolute inset-y-0 w-0.5 cursor-ew-resize outline-none focus-visible:ring-2"
        style={{ left: `${position}%` }}
      >
        <div className="bg-background text-foreground absolute top-1/2 left-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border shadow">
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
            <path fill="currentColor" d="M8 7L3 12l5 5V7zm8 0v10l5-5l-5-5z" />
          </svg>
        </div>
      </div>

      <span className="bg-background/80 pointer-events-none absolute bottom-2 left-2 rounded px-1.5 py-0.5 text-xs font-medium">
        {beforeLabel}
      </span>
      <span className="bg-background/80 pointer-events-none absolute right-2 bottom-2 rounded px-1.5 py-0.5 text-xs font-medium">
        {afterLabel}
      </span>
    </div>
  );
}

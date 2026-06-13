"use client";

import { useCallback, useRef, useState } from "react";

import { cn } from "@/lib/utils";

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
  className?: string;
}

export function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
  beforeLabel = "Original",
  afterLabel = "After",
  showCheckerboard = false,
  zoom = 1,
  className,
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);

  const imgStyle =
    zoom === 1 ? undefined : { transform: `scale(${zoom})` };

  const updateFromClientX = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const ratio = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, ratio)));
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFromClientX(event.clientX);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.buttons !== 1) return;
    updateFromClientX(event.clientX);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      className={cn(
        "relative aspect-video w-full touch-none overflow-hidden rounded-lg select-none",
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
      {/* Before (original) clipped to the left of the handle. */}
      <div
        className="bg-background absolute inset-0 overflow-hidden"
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
        className="bg-background pointer-events-none absolute inset-y-0 w-0.5"
        style={{ left: `${position}%` }}
        aria-hidden
      >
        <div className="bg-background text-foreground absolute top-1/2 left-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border shadow">
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
            <path fill="currentColor" d="M8 7L3 12l5 5V7zm8 0v10l5-5l-5-5z" />
          </svg>
        </div>
      </div>

      <span className="bg-background/80 absolute bottom-2 left-2 rounded px-1.5 py-0.5 text-xs font-medium">
        {beforeLabel}
      </span>
      <span className="bg-background/80 absolute right-2 bottom-2 rounded px-1.5 py-0.5 text-xs font-medium">
        {afterLabel}
      </span>
    </div>
  );
}

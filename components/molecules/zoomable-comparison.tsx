"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { ZoomControl } from "@/components/atoms/zoom-control";
import { BeforeAfterSlider } from "@/components/molecules/before-after-slider";

interface ZoomableComparisonProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel: string;
  afterLabel: string;
  /** The line under the slider saying what to look for. */
  caption: React.ReactNode;
  /** Dims the result while a fresh pass is still running. */
  isStale?: boolean;
  className?: string;
}

/**
 * A before/after slider with its own zoom level and a caption. The zoom state
 * lives here because no caller has ever needed to read it, and three tools
 * were each holding an identical `useState(1)` for it.
 */
export function ZoomableComparison({
  beforeUrl,
  afterUrl,
  beforeLabel,
  afterLabel,
  caption,
  isStale,
  className,
}: ZoomableComparisonProps) {
  const [zoom, setZoom] = useState(1);

  return (
    <div className={cn("space-y-2", className)}>
      <BeforeAfterSlider
        beforeUrl={beforeUrl}
        afterUrl={afterUrl}
        beforeLabel={beforeLabel}
        afterLabel={afterLabel}
        zoom={zoom}
        isStale={isStale}
      />
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">{caption}</span>
        <ZoomControl zoom={zoom} onZoomChange={setZoom} />
      </div>
    </div>
  );
}

export type { ZoomableComparisonProps };

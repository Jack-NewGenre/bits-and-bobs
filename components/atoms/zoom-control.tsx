"use client";

import { cn } from "@/lib/utils";
import { PillButton } from "@/components/atoms/pill-button";

const ZOOM_LEVELS = [1, 2, 4] as const;

interface ZoomControlProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  className?: string;
}

/** Shared zoom-level toggle for before/after result previews. */
export function ZoomControl({
  zoom,
  onZoomChange,
  className,
}: ZoomControlProps) {
  return (
    <div className={cn("flex gap-1", className)}>
      {ZOOM_LEVELS.map((level) => (
        <PillButton
          key={level}
          size="sm"
          active={zoom === level}
          ariaPressed={zoom === level}
          onClick={() => onZoomChange(level)}
        >
          {level === 1 ? "Fit" : `${level}×`}
        </PillButton>
      ))}
    </div>
  );
}

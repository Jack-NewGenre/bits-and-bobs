"use client";

import { PillButton } from "@/components/shared/pill-button";

const ZOOM_LEVELS = [1, 2, 4] as const;

interface ZoomControlProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

/** Shared zoom-level toggle for before/after result previews. */
export function ZoomControl({ zoom, onZoomChange }: ZoomControlProps) {
  return (
    <div className="flex gap-1">
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

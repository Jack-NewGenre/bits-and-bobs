"use client";

import {
  isLossy,
  needsMatte,
  OUTPUT_FORMATS,
  type OutputFormat,
} from "@/lib/image/image-output";
import { Label } from "@/components/ui/label";
import { PillButton } from "@/components/atoms/pill-button";
import { SliderRow } from "@/components/atoms/slider-row";

interface FormatOptionsProps {
  format: OutputFormat;
  quality: number;
  matte: string;
  onFormatChange: (format: OutputFormat) => void;
  onQualityChange: (quality: number) => void;
  onMatteChange: (matte: string) => void;
  /** MIME type of the source, so "Same" can be resolved for the UI. */
  sourceType?: string;
  /** Hide the matte picker when the source has no transparency to lose. */
  showMatte?: boolean;
}

/**
 * Format, quality and matte: the tail end of every tool that writes an image
 * back out, so it looks and behaves the same in each of them.
 */
export function FormatOptions({
  format,
  quality,
  matte,
  onFormatChange,
  onQualityChange,
  onMatteChange,
  sourceType,
  showMatte = true,
}: FormatOptionsProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs">Format</Label>
        <div className="grid grid-cols-4 gap-2">
          {OUTPUT_FORMATS.map(({ value, label }) => (
            <PillButton
              key={value}
              active={format === value}
              ariaPressed={format === value}
              onClick={() => onFormatChange(value)}
            >
              {label}
            </PillButton>
          ))}
        </div>
      </div>

      {isLossy(format, sourceType) && (
        <SliderRow
          label="Quality"
          value={quality}
          min={1}
          max={100}
          onChange={onQualityChange}
        />
      )}

      {showMatte && needsMatte(format, sourceType) && (
        <div className="space-y-2">
          <Label className="text-xs" htmlFor="matte">
            Background behind transparency
          </Label>
          <div className="flex items-center gap-2">
            <input
              id="matte"
              type="color"
              aria-label="Matte colour"
              value={matte}
              onChange={(event) => onMatteChange(event.target.value)}
              className="size-8 shrink-0 cursor-pointer rounded-md border bg-transparent p-0"
            />
            <p className="text-muted-foreground text-xs">
              JPG has no transparency, so anything see-through is painted onto
              this colour first.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

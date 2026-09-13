"use client";

import { useState } from "react";
import { Link, Unlink } from "lucide-react";

import { computeBox, type FitMode, type TransformSettings } from "@/lib/transform";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormatOptions } from "@/components/shared/format-options";
import { PillButton } from "@/components/shared/pill-button";
import { SliderRow } from "@/components/shared/slider-row";

const FITS: { value: FitMode; label: string; hint: string }[] = [
  { value: "contain", label: "Contain", hint: "Fits the whole image in, leaving gaps." },
  { value: "cover", label: "Cover", hint: "Fills the box and crops the overflow." },
  { value: "stretch", label: "Stretch", hint: "Distorts the image to fit exactly." },
];

interface ResizeOptionsProps {
  settings: TransformSettings;
  onChange: (settings: TransformSettings) => void;
  sourceWidth?: number;
  sourceHeight?: number;
  sourceType?: string;
}

export function ResizeOptions({
  settings,
  onChange,
  sourceWidth,
  sourceHeight,
  sourceType,
}: ResizeOptionsProps) {
  const [locked, setLocked] = useState(true);

  const ratio = sourceWidth && sourceHeight ? sourceWidth / sourceHeight : 1;
  const box =
    sourceWidth && sourceHeight
      ? computeBox(sourceWidth, sourceHeight, settings)
      : undefined;

  const setSide = (side: "width" | "height", raw: string) => {
    const value = raw === "" ? undefined : Math.max(1, Number.parseInt(raw, 10));
    if (raw !== "" && Number.isNaN(value)) return;

    // With the ratio locked, only ever hold one side: the other is derived,
    // so it can never drift out of proportion.
    if (locked) {
      onChange({ ...settings, width: undefined, height: undefined, [side]: value });
      return;
    }
    onChange({ ...settings, [side]: value });
  };

  const fit = FITS.find((entry) => entry.value === settings.fit);
  const usingBox = settings.width !== undefined || settings.height !== undefined;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs">Dimensions</Label>
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label className="text-muted-foreground text-xs" htmlFor="resize-width">
              Width
            </Label>
            <Input
              id="resize-width"
              inputMode="numeric"
              placeholder={box ? String(box.width) : "auto"}
              value={settings.width ?? ""}
              onChange={(event) => setSide("width", event.target.value)}
            />
          </div>
          <button
            type="button"
            aria-label={locked ? "Unlock aspect ratio" : "Lock aspect ratio"}
            aria-pressed={locked}
            onClick={() => setLocked(!locked)}
            className={cn(
              "mb-1 rounded-md border p-2 transition-colors",
              locked ? "border-primary bg-accent" : "hover:bg-accent/50",
            )}
          >
            {locked ? <Link className="size-4" /> : <Unlink className="size-4" />}
          </button>
          <div className="flex-1 space-y-1">
            <Label className="text-muted-foreground text-xs" htmlFor="resize-height">
              Height
            </Label>
            <Input
              id="resize-height"
              inputMode="numeric"
              placeholder={box ? String(box.height) : "auto"}
              value={settings.height ?? ""}
              onChange={(event) => setSide("height", event.target.value)}
            />
          </div>
        </div>
        {locked && (
          <p className="text-muted-foreground text-xs">
            Ratio locked at {ratio.toFixed(2)}:1, so set one side and the other
            follows.
          </p>
        )}
      </div>

      {!usingBox && (
        <SliderRow
          label={`Scale (${settings.scale}%)`}
          value={settings.scale}
          min={1}
          max={400}
          onChange={(scale) => onChange({ ...settings, scale })}
        />
      )}

      {!locked && (
        <div className="space-y-2">
          <Label className="text-xs">Fit</Label>
          <div className="grid grid-cols-3 gap-2">
            {FITS.map((entry) => (
              <PillButton
                key={entry.value}
                active={settings.fit === entry.value}
                ariaPressed={settings.fit === entry.value}
                onClick={() => onChange({ ...settings, fit: entry.value })}
              >
                {entry.label}
              </PillButton>
            ))}
          </div>
          {fit && <p className="text-muted-foreground text-xs">{fit.hint}</p>}
        </div>
      )}

      <FormatOptions
        format={settings.format}
        quality={settings.quality}
        matte={settings.matte}
        sourceType={sourceType}
        onFormatChange={(format) => onChange({ ...settings, format })}
        onQualityChange={(quality) => onChange({ ...settings, quality })}
        onMatteChange={(matte) => onChange({ ...settings, matte })}
      />
    </div>
  );
}

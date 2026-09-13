"use client";

import {
  type EnhanceEngine,
  type EnhanceScale,
  type EnhanceSettings,
} from "@/lib/image/enhance";

import { ENHANCE_PRESETS } from "@/lib/image/enhance-presets";
import { Label } from "@/components/ui/label";
import { FormatOptions } from "@/components/molecules/format-options";
import { PillButton } from "@/components/atoms/pill-button";
import { SliderRow } from "@/components/atoms/slider-row";

const SCALES: EnhanceScale[] = [1, 2, 4];

const ENGINES: { value: EnhanceEngine; label: string }[] = [
  { value: "fast", label: "Fast" },
  { value: "ai", label: "AI" },
];

const SETTINGS_KEYS: (keyof EnhanceSettings)[] = [
  "engine",
  "format",
  "quality",
  "scale",
  "sharpen",
  "denoise",
  "brightness",
  "contrast",
  "saturation",
];

function settingsEqual(a: EnhanceSettings, b: EnhanceSettings): boolean {
  return SETTINGS_KEYS.every((key) => a[key] === b[key]);
}

interface EnhanceOptionsProps {
  settings: EnhanceSettings;
  onChange: (settings: EnhanceSettings) => void;
  /** False when the image is too large to hand to the model. */
  aiAvailable?: boolean;
  /** MIME type of the dropped file, so "Same" can be resolved for the UI. */
  sourceType?: string;
}

export function EnhanceOptions({
  settings,
  onChange,
  aiAvailable = true,
  sourceType,
}: EnhanceOptionsProps) {
  const setField = <K extends keyof EnhanceSettings>(
    key: K,
    value: EnhanceSettings[K],
  ) => onChange({ ...settings, [key]: value });

  const activePreset = ENHANCE_PRESETS.find((preset) =>
    settingsEqual(preset.settings, settings),
  )?.id;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-xs">Preset</Label>
        <div className="grid grid-cols-4 gap-2">
          {ENHANCE_PRESETS.map((preset) => (
            <PillButton
              key={preset.id}
              active={activePreset === preset.id}
              onClick={() => onChange(preset.settings)}
            >
              {preset.label}
            </PillButton>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Upscaler</Label>
        <div className="grid grid-cols-2 gap-2">
          {ENGINES.map(({ value, label }) => (
            <PillButton
              key={value}
              active={settings.engine === value}
              ariaPressed={settings.engine === value}
              disabled={value === "ai" && !aiAvailable}
              onClick={() => setField("engine", value)}
            >
              {label}
            </PillButton>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">
          {!aiAvailable
            ? "This image is too large for the AI upscaler."
            : settings.engine === "ai"
              ? "Reconstructs detail with a model. Slower, and downloads once."
              : "Resamples on a canvas. Instant, but cannot invent detail."}
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Upscale</Label>
        <div className="grid grid-cols-3 gap-2">
          {SCALES.map((scale) => (
            <PillButton
              key={scale}
              active={settings.scale === scale}
              ariaPressed={settings.scale === scale}
              onClick={() => setField("scale", scale)}
            >
              {scale}×
            </PillButton>
          ))}
        </div>
      </div>

      <FormatOptions
        format={settings.format}
        quality={settings.quality}
        matte="#ffffff"
        sourceType={sourceType}
        showMatte={false}
        onFormatChange={(format) => setField("format", format)}
        onQualityChange={(quality) => setField("quality", quality)}
        onMatteChange={() => {}}
      />

      <div className="space-y-4">
        <SliderRow
          label="Sharpen"
          value={settings.sharpen}
          min={0}
          max={100}
          onChange={(value) => setField("sharpen", value)}
        />
        <SliderRow
          label="Denoise"
          value={settings.denoise}
          min={0}
          max={100}
          onChange={(value) => setField("denoise", value)}
        />
        <SliderRow
          label="Brightness"
          value={settings.brightness}
          min={-100}
          max={100}
          onChange={(value) => setField("brightness", value)}
        />
        <SliderRow
          label="Contrast"
          value={settings.contrast}
          min={-100}
          max={100}
          onChange={(value) => setField("contrast", value)}
        />
        <SliderRow
          label="Saturation"
          value={settings.saturation}
          min={-100}
          max={100}
          onChange={(value) => setField("saturation", value)}
        />
      </div>
    </div>
  );
}

"use client";

import {
  type EnhanceEngine,
  type EnhanceScale,
  type EnhanceSettings,
} from "@/lib/image/enhance";

import { ENHANCE_PRESETS } from "@/lib/image/enhance-presets";
import { FormatOptions } from "@/components/molecules/format-options";
import { SliderRow } from "@/components/atoms/slider-row";
import { OptionGroup } from "@/components/molecules/option-group";

const SCALE_CHOICES = ([1, 2, 4] as EnhanceScale[]).map((scale) => ({
  value: scale,
  label: `${scale}×`,
}));

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
      <OptionGroup
        label="Preset"
        choices={ENHANCE_PRESETS.map((preset) => ({
          value: preset.id,
          label: preset.label,
        }))}
        value={activePreset ?? ""}
        onChange={(id) => {
          const preset = ENHANCE_PRESETS.find((entry) => entry.id === id);
          if (preset) onChange(preset.settings);
        }}
        columns={4}
      />

      <OptionGroup
        label="Upscaler"
        choices={ENGINES.map((engine) => ({
          ...engine,
          disabled: engine.value === "ai" && !aiAvailable,
        }))}
        value={settings.engine}
        onChange={(engine) => setField("engine", engine)}
        columns={2}
        hint={
          !aiAvailable
            ? "This image is too large for the AI upscaler."
            : settings.engine === "ai"
              ? "Reconstructs detail with a model. Slower, and downloads once."
              : "Resamples on a canvas. Instant, but cannot invent detail."
        }
      />

      <OptionGroup
        label="Upscale"
        choices={SCALE_CHOICES}
        value={settings.scale}
        onChange={(scale) => setField("scale", scale)}
        columns={3}
      />

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

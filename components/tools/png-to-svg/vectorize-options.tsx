"use client";

import {
  GRAYSCALE_MAX_COLORS,
  MAX_COLORS,
  MIN_COLORS,
  VECTORIZE_PRESETS,
  type VectorizeMode,
  type VectorizeSettings,
} from "@/lib/image/vectorize";
import { Label } from "@/components/ui/label";
import { PillButton } from "@/components/atoms/pill-button";
import { SliderRow } from "@/components/atoms/slider-row";

const MODES: { id: VectorizeMode; label: string }[] = [
  { id: "color", label: "Colour" },
  { id: "grayscale", label: "Greyscale" },
  { id: "bw", label: "Black & white" },
];

const SETTINGS_KEYS: (keyof VectorizeSettings)[] = [
  "mode",
  "colors",
  "smoothing",
  "despeckle",
];

function settingsEqual(a: VectorizeSettings, b: VectorizeSettings): boolean {
  return SETTINGS_KEYS.every((key) => a[key] === b[key]);
}

interface VectorizeOptionsProps {
  settings: VectorizeSettings;
  onChange: (settings: VectorizeSettings) => void;
}

export function VectorizeOptions({ settings, onChange }: VectorizeOptionsProps) {
  const setField = <K extends keyof VectorizeSettings>(
    key: K,
    value: VectorizeSettings[K],
  ) => onChange({ ...settings, [key]: value });

  const activePreset = VECTORIZE_PRESETS.find((preset) =>
    settingsEqual(preset.settings, settings),
  )?.id;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-xs">Preset</Label>
        <div className="grid grid-cols-4 gap-2">
          {VECTORIZE_PRESETS.map((preset) => (
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
        <Label className="text-xs">Mode</Label>
        <div className="grid grid-cols-3 gap-2">
          {MODES.map((mode) => (
            <PillButton
              key={mode.id}
              active={settings.mode === mode.id}
              ariaPressed={settings.mode === mode.id}
              onClick={() => setField("mode", mode.id)}
            >
              {mode.label}
            </PillButton>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <SliderRow
          label="Colours"
          value={settings.colors}
          min={MIN_COLORS}
          max={settings.mode === "grayscale" ? GRAYSCALE_MAX_COLORS : MAX_COLORS}
          disabled={settings.mode === "bw"}
          onChange={(value) => setField("colors", value)}
        />
        <SliderRow
          label="Smoothing"
          value={settings.smoothing}
          min={0}
          max={100}
          onChange={(value) => setField("smoothing", value)}
        />
        <SliderRow
          label="Despeckle"
          value={settings.despeckle}
          min={0}
          max={100}
          onChange={(value) => setField("despeckle", value)}
        />
      </div>
    </div>
  );
}

"use client";

import {
  GRAYSCALE_MAX_COLORS,
  MAX_COLORS,
  MIN_COLORS,
  VECTORIZE_PRESETS,
  type VectorizeMode,
  type VectorizeSettings,
} from "@/lib/image/vectorize";
import { SliderRow } from "@/components/atoms/slider-row";
import { OptionGroup } from "@/components/molecules/option-group";

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

const PRESET_CHOICES = VECTORIZE_PRESETS.map((preset) => ({
  value: preset.id,
  label: preset.label,
}));

const MODE_CHOICES = MODES.map((mode) => ({ value: mode.id, label: mode.label }));

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
      <OptionGroup
        label="Preset"
        choices={PRESET_CHOICES}
        value={activePreset ?? ""}
        onChange={(id) => {
          const preset = VECTORIZE_PRESETS.find((entry) => entry.id === id);
          if (preset) onChange(preset.settings);
        }}
        columns={4}
      />

      <OptionGroup
        label="Mode"
        choices={MODE_CHOICES}
        value={settings.mode}
        onChange={(mode) => setField("mode", mode)}
        columns={3}
      />

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

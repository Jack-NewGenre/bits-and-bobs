"use client";

import {
  ENHANCE_PRESETS,
  type EnhanceScale,
  type EnhanceSettings,
} from "@/lib/enhance";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

const SCALES: EnhanceScale[] = [1, 2, 4];

const SETTINGS_KEYS: (keyof EnhanceSettings)[] = [
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

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

function SliderRow({ label, value, min, max, onChange }: SliderRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-muted-foreground text-xs tabular-nums">
          {value}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={1}
        onValueChange={([next]) => onChange(next)}
        aria-label={label}
      />
    </div>
  );
}

interface PillButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  ariaPressed?: boolean;
}

function PillButton({ active, onClick, children, ariaPressed }: PillButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={ariaPressed}
      onClick={onClick}
      className={cn(
        "rounded-lg border p-2 text-xs font-medium transition-colors",
        active ? "border-primary bg-accent" : "hover:bg-accent/50",
      )}
    >
      {children}
    </button>
  );
}

interface EnhanceOptionsProps {
  settings: EnhanceSettings;
  onChange: (settings: EnhanceSettings) => void;
}

export function EnhanceOptions({ settings, onChange }: EnhanceOptionsProps) {
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

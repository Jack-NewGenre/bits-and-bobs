"use client";

import { useState } from "react";

import type { Rgb } from "@/lib/colour/colour";
import { MAX_BORDER, type StickerSettings } from "@/lib/image/sticker";
import { SliderRow } from "@/components/atoms/slider-row";
import { ColourInput } from "@/components/molecules/colour-input";
import { OptionGroup } from "@/components/molecules/option-group";

type BorderChoice = "white" | "black" | "custom";
type ShadowChoice = "on" | "off";
type BackgroundChoice = "remove" | "keep";

const PRESETS: Record<Exclude<BorderChoice, "custom">, Rgb> = {
  white: { r: 255, g: 255, b: 255, a: 1 },
  black: { r: 0, g: 0, b: 0, a: 1 },
};

const BORDER_CHOICES = [
  { value: "white", label: "White" },
  { value: "black", label: "Black" },
  { value: "custom", label: "Custom" },
] as const;

const BACKGROUND_CHOICES = [
  { value: "remove", label: "Remove" },
  { value: "keep", label: "Keep" },
] as const;

const SHADOW_CHOICES = [
  { value: "on", label: "On" },
  { value: "off", label: "Off" },
] as const;

function presetFor({ r, g, b, a }: Rgb): BorderChoice {
  const match = (["white", "black"] as const).find((key) => {
    const preset = PRESETS[key];
    return preset.r === r && preset.g === g && preset.b === b && preset.a === a;
  });
  return match ?? "custom";
}

interface StickerOptionsProps {
  settings: StickerSettings;
  onChange: (settings: StickerSettings) => void;
}

/** Whether the background goes, the border's thickness and colour, and the shadow. */
export function StickerOptions({ settings, onChange }: StickerOptionsProps) {
  const [choice, setChoice] = useState(() => presetFor(settings.borderColour));

  const chooseBorder = (next: BorderChoice) => {
    setChoice(next);
    if (next !== "custom")
      onChange({ ...settings, borderColour: PRESETS[next] });
  };

  return (
    <div className="space-y-4">
      <OptionGroup<BackgroundChoice>
        label="Background"
        choices={BACKGROUND_CHOICES}
        value={settings.removeBackground ? "remove" : "keep"}
        onChange={(value) =>
          onChange({ ...settings, removeBackground: value === "remove" })
        }
      />
      <SliderRow
        label="Border (%)"
        value={settings.border}
        min={0}
        max={MAX_BORDER}
        onChange={(border) => onChange({ ...settings, border })}
      />
      <OptionGroup
        label="Border colour"
        choices={BORDER_CHOICES}
        value={choice}
        onChange={chooseBorder}
        disabled={settings.border === 0}
      />
      {choice === "custom" && (
        <ColourInput
          label="Custom colour"
          value={settings.borderColour}
          onChange={(borderColour) => onChange({ ...settings, borderColour })}
        />
      )}
      <OptionGroup<ShadowChoice>
        label="Shadow"
        choices={SHADOW_CHOICES}
        value={settings.shadow ? "on" : "off"}
        onChange={(value) => onChange({ ...settings, shadow: value === "on" })}
      />
    </div>
  );
}

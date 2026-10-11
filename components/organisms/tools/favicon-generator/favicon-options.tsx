"use client";

import type { Rgb } from "@/lib/colour/colour";
import { MAX_RADIUS } from "@/lib/image/favicon";
import { SliderRow } from "@/components/atoms/slider-row";
import { ColourInput } from "@/components/molecules/colour-input";
import { OptionGroup } from "@/components/molecules/option-group";

export type BackgroundChoice = "transparent" | "white" | "black" | "custom";

const PRESETS: Record<
  Exclude<BackgroundChoice, "transparent" | "custom">,
  Rgb
> = {
  white: { r: 255, g: 255, b: 255, a: 1 },
  black: { r: 0, g: 0, b: 0, a: 1 },
};

const BACKGROUND_CHOICES = [
  { value: "transparent", label: "None" },
  { value: "white", label: "White" },
  { value: "black", label: "Black" },
  { value: "custom", label: "Custom" },
] as const;

/** The fill a background choice paints, or `undefined` to stay transparent. */
export function backgroundColour(
  choice: BackgroundChoice,
  custom: Rgb,
): Rgb | undefined {
  if (choice === "transparent") return undefined;
  return choice === "custom" ? custom : PRESETS[choice];
}

interface FaviconOptionsProps {
  radius: number;
  onRadiusChange: (radius: number) => void;
  background: BackgroundChoice;
  onBackgroundChange: (choice: BackgroundChoice) => void;
  custom: Rgb;
  onCustomChange: (colour: Rgb) => void;
  disabled?: boolean;
}

/** Corner radius and the colour behind the image. */
export function FaviconOptions({
  radius,
  onRadiusChange,
  background,
  onBackgroundChange,
  custom,
  onCustomChange,
  disabled,
}: FaviconOptionsProps) {
  return (
    <div className="space-y-4">
      <SliderRow
        label="Corner radius (%)"
        value={radius}
        min={0}
        max={MAX_RADIUS}
        onChange={onRadiusChange}
        disabled={disabled}
      />
      <OptionGroup
        label="Background"
        choices={BACKGROUND_CHOICES}
        value={background}
        onChange={onBackgroundChange}
        disabled={disabled}
        hint="Fills any transparent areas. The rounded corners stay transparent."
      />
      {background === "custom" && (
        <ColourInput
          label="Background colour"
          value={custom}
          onChange={onCustomChange}
        />
      )}
    </div>
  );
}

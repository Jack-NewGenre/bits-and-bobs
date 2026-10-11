"use client";

import { useState } from "react";

import {
  COLOUR_RANGES,
  isNeutralShift,
  type ColourRange,
  type RangeShift,
  type RangeShifts,
} from "@/lib/image/editor/hue-ranges";
import { OptionGroup } from "@/components/molecules/option-group";
import { SliderRow } from "@/components/atoms/slider-row";

const RANGE_SWATCHES: Record<ColourRange, string> = {
  reds: "#e5484d",
  yellows: "#f5d90a",
  greens: "#46a758",
  cyans: "#05a2c2",
  blues: "#3e63dd",
  magentas: "#d6409f",
};

const SLIDERS: readonly {
  key: keyof RangeShift;
  label: string;
  min: number;
  max: number;
}[] = [
  { key: "hue", label: "Hue", min: -180, max: 180 },
  { key: "saturation", label: "Saturation", min: -100, max: 100 },
  { key: "lightness", label: "Lightness", min: -100, max: 100 },
];

interface ColourRangeAdjusterProps {
  shifts: RangeShifts;
  onChange: (shifts: RangeShifts) => void;
}

/** Hue, saturation and lightness for one colour range at a time. */
export function ColourRangeAdjuster({
  shifts,
  onChange,
}: ColourRangeAdjusterProps) {
  const [range, setRange] = useState<ColourRange>("reds");
  const choices = COLOUR_RANGES.map((value) => ({
    value,
    label: (
      <span
        aria-label={value}
        title={value[0].toUpperCase() + value.slice(1)}
        className="ring-foreground/20 inline-block size-3 rounded-full ring-1"
        style={{
          backgroundColor: RANGE_SWATCHES[value],
          outline: isNeutralShift(shifts[value])
            ? undefined
            : "1.5px solid currentColor",
          outlineOffset: 2,
        }}
      />
    ),
  }));

  return (
    <div className="space-y-3">
      <OptionGroup
        label="Colour range"
        choices={choices}
        value={range}
        onChange={setRange}
      />
      {SLIDERS.map(({ key, label, min, max }) => (
        <SliderRow
          key={key}
          label={label}
          value={shifts[range][key]}
          min={min}
          max={max}
          onChange={(value) =>
            onChange({ ...shifts, [range]: { ...shifts[range], [key]: value } })
          }
        />
      ))}
    </div>
  );
}

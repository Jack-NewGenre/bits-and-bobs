"use client";

import { useState } from "react";

import {
  type Rgb,
} from "@/lib/colour";
import {
  formatHex,
  formatHsl,
  formatOklch,
  formatRgb,
} from "@/lib/colour-format";
import { bestTextOn, contrastRatio } from "@/lib/colour-contrast";
import { Card, CardContent } from "@/components/ui/card";
import { ColourInput } from "@/components/shared/colour-input";
import { CopyButton } from "@/components/shared/copy-button";

const INITIAL: Rgb = { r: 59, g: 130, b: 246, a: 1 };

const FORMATS: { label: string; format: (colour: Rgb) => string }[] = [
  { label: "HEX", format: formatHex },
  { label: "RGB", format: formatRgb },
  { label: "HSL", format: formatHsl },
  { label: "OKLCH", format: formatOklch },
];

export function ColourConverterTool() {
  const [colour, setColour] = useState<Rgb>(INITIAL);

  const hex = formatHex(colour);
  const ink = formatHex(bestTextOn(colour));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <Card>
        <CardContent className="space-y-5">
          <ColourInput label="Colour" value={colour} onChange={setColour} />
          <div
            style={{ backgroundColor: hex, color: ink }}
            className="flex h-40 items-end rounded-lg border p-3 font-mono text-sm"
          >
            {hex}
          </div>
          <p className="text-muted-foreground text-xs">
            Contrast against white {contrastRatio(colour, {
              r: 255,
              g: 255,
              b: 255,
              a: 1,
            }).toFixed(2)}
            :1 · against black{" "}
            {contrastRatio(colour, { r: 0, g: 0, b: 0, a: 1 }).toFixed(2)}:1
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          {FORMATS.map(({ label, format }) => {
            const value = format(colour);
            return (
              <div key={label} className="space-y-1.5">
                <p className="text-muted-foreground text-xs">{label}</p>
                <div className="flex items-center gap-2">
                  <code className="bg-muted flex-1 truncate rounded-md px-3 py-2 font-mono text-sm">
                    {value}
                  </code>
                  <CopyButton value={value} iconOnly label={`Copy ${label}`} />
                </div>
              </div>
            );
          })}
          <p className="text-muted-foreground pt-1 text-xs">
            OKLCH is perceptually uniform: equal steps in it look like equal
            steps to the eye, which is why Tailwind v4 uses it.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

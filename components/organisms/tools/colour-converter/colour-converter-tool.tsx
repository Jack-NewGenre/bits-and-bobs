"use client";

import { useState } from "react";

import type { Rgb } from "@/lib/colour/colour";
import { formatHex } from "@/lib/colour/colour-format";
import { bestTextOn, contrastRatio } from "@/lib/colour/colour-contrast";
import { Card, CardContent } from "@/components/ui/card";
import { ColourInput } from "@/components/molecules/colour-input";
import { ColourFormatList } from "@/components/molecules/colour-format-list";

const INITIAL: Rgb = { r: 59, g: 130, b: 246, a: 1 };

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
            Contrast against white{" "}
            {contrastRatio(colour, {
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
          <ColourFormatList colour={colour} />
          <p className="text-muted-foreground pt-1 text-xs">
            OKLCH is perceptually uniform: equal steps in it look like equal
            steps to the eye, which is why Tailwind v4 uses it. Display P3 is
            the wider gamut of modern screens.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

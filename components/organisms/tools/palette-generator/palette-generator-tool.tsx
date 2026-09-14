"use client";

import { useState } from "react";

import {
  type Rgb,
} from "@/lib/colour/colour";
import {
  formatHex,
} from "@/lib/colour/colour-format";
import { buildHarmony, HARMONIES, type Harmony } from "@/lib/colour/colour-harmony";
import { Card, CardContent } from "@/components/ui/card";
import { ColourInput } from "@/components/molecules/colour-input";
import { ColourSwatch } from "@/components/atoms/colour-swatch";
import { CopyButton } from "@/components/atoms/copy-button";
import { OptionGroup } from "@/components/molecules/option-group";

const INITIAL: Rgb = { r: 59, g: 130, b: 246, a: 1 };

const HARMONY_CHOICES = HARMONIES.map((entry) => ({
  value: entry.id,
  label: entry.label,
}));

export function PaletteGeneratorTool() {
  const [colour, setColour] = useState<Rgb>(INITIAL);
  const [harmony, setHarmony] = useState<Harmony>(HARMONIES[0]);

  const palette = buildHarmony(colour, harmony);
  const asCss = palette.map((entry) => formatHex(entry)).join("\n");

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <Card>
        <CardContent className="space-y-5">
          <ColourInput label="Base colour" value={colour} onChange={setColour} />

          <OptionGroup
            label="Harmony"
            choices={HARMONY_CHOICES}
            value={harmony.id}
            onChange={(id) => {
              const next = HARMONIES.find((entry) => entry.id === id);
              if (next) setHarmony(next);
            }}
            columns={2}
            hint={harmony.description}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {palette.map((entry, index) => (
              <ColourSwatch
                key={`${formatHex(entry)}-${index}`}
                colour={entry}
                caption={index === 0 ? "Base" : `${index + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-muted-foreground text-xs">
              Rotated in OKLCH, so every colour keeps the lightness of the one
              you picked, and any that sRGB cannot show is pulled back by
              chroma, not by bending its hue.
            </p>
            <CopyButton value={asCss} label="Copy all" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

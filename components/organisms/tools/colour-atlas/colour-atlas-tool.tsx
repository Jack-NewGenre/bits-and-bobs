"use client";

import { useState } from "react";
import { Dices } from "lucide-react";

import type { Rgb } from "@/lib/colour/colour";
import { describeColour } from "@/lib/colour/colour-atlas";
import { simulateColour, VISION_MODES } from "@/lib/colour/colour-blindness";
import { formatHex } from "@/lib/colour/colour-format";
import {
  buildHarmony,
  buildShades,
  HARMONIES,
  randomBaseColour,
} from "@/lib/colour/colour-harmony";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ColourFormatList } from "@/components/molecules/colour-format-list";
import { ColourInput } from "@/components/molecules/colour-input";
import { AtlasContrast } from "@/components/organisms/tools/colour-atlas/atlas-contrast";
import { AtlasSwatchRow } from "@/components/organisms/tools/colour-atlas/atlas-swatch-row";

const INITIAL: Rgb = { r: 59, g: 130, b: 246, a: 1 };

/** Harmonies worth a row of their own; monochromatic repeats the shade scale. */
const ATLAS_HARMONIES = HARMONIES.filter(
  (harmony) => harmony.id !== "monochromatic",
);

const DEFICIENT_VISION = VISION_MODES.filter((mode) => mode.id !== "normal");

export function ColourAtlasTool() {
  const [colour, setColour] = useState<Rgb>(INITIAL);
  const facts = describeColour(colour);
  const hex = formatHex(colour);

  const stats = [
    { label: "Lightness", value: `${Math.round(facts.oklch.l * 100)}%` },
    { label: "Chroma", value: facts.oklch.c.toFixed(3) },
    { label: "Hue", value: `${Math.round(facts.oklch.h)}°` },
    { label: "Luminance", value: facts.luminance.toFixed(3) },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-2">
              <ColourInput
                label="Colour"
                value={colour}
                onChange={setColour}
                className="flex-1"
              />
              <Button
                variant="secondary"
                aria-label="Random colour"
                onClick={() => setColour(randomBaseColour())}
              >
                <Dices />
              </Button>
            </div>
            <div
              className="flex h-40 flex-col justify-end rounded-lg border p-4"
              style={{ backgroundColor: hex, color: facts.textOn }}
            >
              <p className="text-2xl font-semibold capitalize">{facts.name}</p>
              <p className="font-mono text-sm">{hex}</p>
            </div>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
              {stats.map(({ label, value }) => (
                <div key={label} className="bg-muted rounded-md px-3 py-2">
                  <dt className="text-muted-foreground text-xs">{label}</dt>
                  <dd className="font-mono text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <ColourFormatList colour={colour} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-6">
          <AtlasSwatchRow
            title="Tints and shades"
            hint="The full 50–950 scale, built in OKLCH"
            swatches={buildShades(colour).map((shade) => ({
              colour: shade.colour,
              caption: shade.isBase ? `${shade.step} ●` : String(shade.step),
            }))}
          />

          {ATLAS_HARMONIES.map((harmony) => (
            <AtlasSwatchRow
              key={harmony.id}
              title={harmony.label}
              hint={harmony.description}
              swatches={buildHarmony(colour, harmony).map((entry) => ({
                colour: entry,
                caption: formatHex(entry),
              }))}
            />
          ))}

          <AtlasContrast colour={colour} />

          <AtlasSwatchRow
            title="Colour vision"
            hint="How it looks with each kind of colour blindness"
            swatches={DEFICIENT_VISION.map((mode) => ({
              colour: simulateColour(colour, mode.matrix),
              caption: mode.label,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

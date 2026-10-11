"use client";

import { useState } from "react";
import { Lock, LockOpen, Shuffle } from "lucide-react";

import { type Rgb } from "@/lib/colour/colour";
import { formatHex } from "@/lib/colour/colour-format";
import {
  buildHarmony,
  HARMONIES,
  randomBaseColour,
  type Harmony,
} from "@/lib/colour/colour-harmony";
import { Button } from "@/components/ui/button";
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

/** Swatches pinned by position, so a shuffle leaves them where they are. */
type Locks = Partial<Record<number, Rgb>>;

export function PaletteGeneratorTool() {
  const [colour, setColour] = useState<Rgb>(INITIAL);
  const [harmony, setHarmony] = useState<Harmony>(HARMONIES[0]);
  const [locks, setLocks] = useState<Locks>({});

  const palette = buildHarmony(colour, harmony).map(
    (entry, index) => locks[index] ?? entry,
  );
  const asCss = palette.map((entry) => formatHex(entry)).join("\n");

  const toggleLock = (index: number) =>
    setLocks(({ [index]: current, ...rest }) =>
      current ? rest : { ...rest, [index]: palette[index] },
    );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <Card>
        <CardContent className="space-y-5">
          <ColourInput
            label="Base colour"
            value={colour}
            onChange={setColour}
          />

          <OptionGroup
            label="Harmony"
            choices={HARMONY_CHOICES}
            value={harmony.id}
            onChange={(id) => {
              const next = HARMONIES.find((entry) => entry.id === id);
              if (!next) return;
              setHarmony(next);
              // Positions mean something different in another harmony.
              setLocks({});
            }}
            columns={2}
            hint={harmony.description}
          />

          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setColour(randomBaseColour())}
          >
            <Shuffle />
            Shuffle
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {palette.map((entry, index) => {
              const locked = locks[index] !== undefined;
              const Icon = locked ? Lock : LockOpen;
              return (
                <div key={`${formatHex(entry)}-${index}`} className="space-y-1">
                  <ColourSwatch
                    colour={entry}
                    caption={index === 0 ? "Base" : `${index + 1}`}
                  />
                  <Button
                    variant={locked ? "secondary" : "ghost"}
                    size="xs"
                    className="w-full"
                    aria-pressed={locked}
                    aria-label={`${locked ? "Unlock" : "Lock"} colour ${index + 1}`}
                    onClick={() => toggleLock(index)}
                  >
                    <Icon />
                    {locked ? "Locked" : "Lock"}
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-muted-foreground text-xs">
              Rotated in OKLCH, so every colour keeps the lightness of the one
              you picked, and any that sRGB cannot show is pulled back by
              chroma, not by bending its hue. Lock a colour to keep it through a
              shuffle.
            </p>
            <CopyButton value={asCss} label="Copy all" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

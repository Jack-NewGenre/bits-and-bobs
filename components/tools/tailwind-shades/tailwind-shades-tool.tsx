"use client";

import { useState } from "react";

import {
  type Rgb,
} from "@/lib/colour";
import {
  formatHex,
  formatOklch,
} from "@/lib/colour-format";
import { buildShades } from "@/lib/colour-harmony";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ColourInput } from "@/components/shared/colour-input";
import { ColourSwatch } from "@/components/shared/colour-swatch";
import { CopyButton } from "@/components/shared/copy-button";
import { PillButton } from "@/components/shared/pill-button";
import { Input } from "@/components/ui/input";

const INITIAL: Rgb = { r: 59, g: 130, b: 246, a: 1 };

type Syntax = "css" | "hex";

/** A Tailwind v4 `@theme` block, which is how v4 expects custom colours. */
function toThemeBlock(name: string, shades: ReturnType<typeof buildShades>) {
  const safeName =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "brand";
  const lines = shades.map(
    (shade) => `  --color-${safeName}-${shade.step}: ${formatOklch(shade.colour)};`,
  );
  return `@theme {\n${lines.join("\n")}\n}`;
}

function toHexList(name: string, shades: ReturnType<typeof buildShades>) {
  const safeName = name.trim() || "brand";
  const lines = shades.map(
    (shade) => `  ${shade.step}: "${formatHex(shade.colour)}",`,
  );
  return `${safeName}: {\n${lines.join("\n")}\n}`;
}

export function TailwindShadesTool() {
  const [colour, setColour] = useState<Rgb>(INITIAL);
  const [name, setName] = useState("brand");
  const [syntax, setSyntax] = useState<Syntax>("css");

  const shades = buildShades(colour);
  const output =
    syntax === "css" ? toThemeBlock(name, shades) : toHexList(name, shades);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardContent className="space-y-5">
            <ColourInput label="Base colour" value={colour} onChange={setColour} />
            <div className="space-y-2">
              <Label className="text-xs" htmlFor="scale-name">
                Scale name
              </Label>
              <Input
                id="scale-name"
                value={name}
                spellCheck={false}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <PillButton
                  active={syntax === "css"}
                  ariaPressed={syntax === "css"}
                  size="sm"
                  onClick={() => setSyntax("css")}
                >
                  Tailwind v4
                </PillButton>
                <PillButton
                  active={syntax === "hex"}
                  ariaPressed={syntax === "hex"}
                  size="sm"
                  onClick={() => setSyntax("hex")}
                >
                  Hex object
                </PillButton>
              </div>
              <CopyButton value={output} />
            </div>
            <pre className="bg-muted max-h-64 overflow-auto rounded-md p-3 font-mono text-xs">
              {output}
            </pre>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-11">
            {shades.map((shade) => (
              <ColourSwatch
                key={shade.step}
                colour={shade.colour}
                caption={shade.isBase ? `${shade.step} ●` : `${shade.step}`}
              />
            ))}
          </div>
          <p className="text-muted-foreground text-xs">
            The dot marks the step your colour landed on. Lightness follows a
            fixed perceptual ramp and chroma tapers at both ends, so the 50 does
            not look washed out and the 950 does not turn muddy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

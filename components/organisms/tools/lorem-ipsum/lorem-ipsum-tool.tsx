"use client";

import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

import { useClientSeed } from "@/hooks/use-client-seed";
import { useDebounced } from "@/hooks/use-debounced";
import {
  countLorem,
  DEFAULT_LOREM_SETTINGS,
  generateLorem,
  MAX_COUNT,
  type LoremSettings,
  type LoremUnit,
} from "@/lib/generators/lorem";
import { clamp } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/atoms/copy-button";
import { PillButton } from "@/components/atoms/pill-button";
import { SliderRow } from "@/components/atoms/slider-row";
import { TextAreaField } from "@/components/atoms/text-area-field";
import { TextPane } from "@/components/molecules/text-pane";
import { OptionGroup } from "@/components/molecules/option-group";

const UNITS: { value: LoremUnit; label: string }[] = [
  { value: "paragraphs", label: "Paragraphs" },
  { value: "sentences", label: "Sentences" },
  { value: "words", label: "Words" },
];

/** Stable, so the seed is drawn exactly once after hydration. */
const drawSeed = () => Math.floor(Math.random() * 2 ** 31);

export function LoremIpsumTool() {
  const [settings, setSettings] = useState<LoremSettings>(DEFAULT_LOREM_SETTINGS);
  // The seed is client-only: a random one on the server would not match the
  // one the browser draws, and hydration would fail.
  const [seed, setSeed] = useClientSeed(drawSeed, 1);

  // The sliders fire on every step they pass through, and each step rebuilds
  // and re-measures the whole document. The readout beside the slider still
  // tracks the live value; only the text waits for the drag to settle.
  const settled = useDebounced(settings);
  const text = useMemo(() => generateLorem(settled, seed), [settled, seed]);
  const stats = useMemo(() => countLorem(text), [text]);

  const set = <K extends keyof LoremSettings>(key: K, value: LoremSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-5">
          <OptionGroup
            label="Generate"
            choices={UNITS}
            value={settings.unit}
            onChange={(unit) => set("unit", unit)}
            columns={3}
          />

          <SliderRow
            label="How many"
            value={settings.count}
            min={1}
            max={MAX_COUNT}
            onChange={(count) => set("count", clamp(count, 1, MAX_COUNT))}
          />

          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Start with</Label>
              <PillButton
                active={settings.classic}
                ariaPressed={settings.classic}
                onClick={() => set("classic", !settings.classic)}
              >
                &ldquo;Lorem ipsum dolor sit amet&rdquo;
              </PillButton>
            </div>

            {settings.unit === "paragraphs" && (
              <div className="space-y-2">
                <Label className="text-xs">Markup</Label>
                <PillButton
                  active={settings.html}
                  ariaPressed={settings.html}
                  onClick={() => set("html", !settings.html)}
                >
                  Wrap in &lt;p&gt;
                </PillButton>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => setSeed(drawSeed())}
              className="ml-auto"
            >
              <RefreshCw className="size-4" />
              Shuffle
            </Button>
          </div>
        </CardContent>
      </Card>

      <TextPane
        label="Placeholder text"
        aside={
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">
              {stats.words} words · {stats.characters} characters
            </span>
            <CopyButton value={text} size="xs" />
          </div>
        }
      >
        <TextAreaField ariaLabel="Placeholder text" value={text} readOnly />
      </TextPane>
    </div>
  );
}

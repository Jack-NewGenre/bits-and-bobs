"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

import {
  DEFAULT_UUID_OPTIONS,
  generateUuids,
  MAX_COUNT,
  MIN_COUNT,
  type UuidOptions,
} from "@/lib/generators/uuid";
import { useClientSeed } from "@/hooks/use-client-seed";
import { clamp } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/atoms/copy-button";
import { PillButton } from "@/components/atoms/pill-button";
import { UuidList } from "@/components/organisms/tools/uuid/uuid-list";

/** Stable, so the seed runs exactly once. */
const seedUuids = () => generateUuids(DEFAULT_UUID_OPTIONS);

/** Long enough to skip the digits typed on the way to the real number. */
const COUNT_SETTLE_MS = 250;

const TOGGLES: { key: keyof UuidOptions; label: string }[] = [
  { key: "uppercase", label: "Uppercase" },
  { key: "hyphens", label: "Hyphens" },
];

export function UuidTool() {
  const [options, setOptions] = useState<UuidOptions>(DEFAULT_UUID_OPTIONS);
  // Client-only: crypto is non-deterministic, so the server cannot render
  // these without the two disagreeing at hydration.
  const [uuids, setUuids] = useClientSeed(seedUuids, []);

  // The settled count below reads the options back out of this rather than
  // out of the render it was scheduled in, so a format toggled while that
  // timer is pending is not overwritten by the values it captured.
  const optionsRef = useRef(options);

  // Apply an options change and regenerate from the new options in one go.
  const apply = (next: UuidOptions) => {
    optionsRef.current = next;
    setOptions(next);
    setUuids(generateUuids(next));
  };

  const regenerate = () => setUuids(generateUuids(options));

  // Typing "1000" passes through 1, 10 and 100 on the way, and each of those
  // would generate and render a whole list that is about to be replaced. The
  // box shows what was typed straight away; the list waits for a pause.
  const [countText, setCountText] = useState(String(DEFAULT_UUID_OPTIONS.count));
  const countTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(countTimer.current), []);

  const setCount = (raw: string) => {
    setCountText(raw);
    clearTimeout(countTimer.current);
    countTimer.current = setTimeout(() => {
      const count = clamp(Math.round(Number(raw)) || MIN_COUNT, MIN_COUNT, MAX_COUNT);
      apply({ ...optionsRef.current, count });
    }, COUNT_SETTLE_MS);
  };

  const toggle = (key: keyof UuidOptions) =>
    apply({ ...options, [key]: !options[key] });

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <Card className="h-fit">
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="uuid-count">How many</Label>
            <Input
              id="uuid-count"
              type="number"
              min={MIN_COUNT}
              max={MAX_COUNT}
              value={countText}
              onChange={(event) => setCount(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Format</Label>
            <div className="grid grid-cols-2 gap-2">
              {TOGGLES.map(({ key, label }) => (
                <PillButton
                  key={key}
                  active={Boolean(options[key])}
                  ariaPressed={Boolean(options[key])}
                  onClick={() => toggle(key)}
                >
                  {label}
                </PillButton>
              ))}
            </div>
          </div>

          <Button type="button" className="w-full" onClick={regenerate}>
            <RefreshCw />
            Regenerate
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              {uuids.length} {uuids.length === 1 ? "UUID" : "UUIDs"}
            </p>
            <CopyButton
              value={() => uuids.join("\n")}
              label="Copy all"
              disabled={uuids.length === 0}
            />
          </div>
          <UuidList uuids={uuids} />
        </CardContent>
      </Card>
    </div>
  );
}

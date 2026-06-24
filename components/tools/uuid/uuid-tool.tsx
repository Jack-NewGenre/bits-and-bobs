"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import {
  DEFAULT_UUID_OPTIONS,
  generateUuids,
  MAX_COUNT,
  MIN_COUNT,
  type UuidOptions,
} from "@/lib/uuid";
import { clamp } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/shared/copy-button";

const TOGGLES: { key: keyof UuidOptions; label: string }[] = [
  { key: "uppercase", label: "Uppercase" },
  { key: "hyphens", label: "Hyphens" },
];

export function UuidTool() {
  const [options, setOptions] = useState<UuidOptions>(DEFAULT_UUID_OPTIONS);
  // Seeded client-side only to avoid a SSR/hydration mismatch (crypto is
  // non-deterministic so server and client would produce different UUIDs).
  const [uuids, setUuids] = useState<string[]>([]);

  useEffect(() => {
    setUuids(generateUuids(DEFAULT_UUID_OPTIONS));
  }, []);

  // Apply an options change and regenerate from the new options in one go.
  const apply = (next: UuidOptions) => {
    setOptions(next);
    setUuids(generateUuids(next));
  };

  const regenerate = () => setUuids(generateUuids(options));

  const setCount = (count: number) =>
    apply({ ...options, count: clamp(count, MIN_COUNT, MAX_COUNT) });

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
              value={options.count}
              onChange={(event) => setCount(Number(event.target.value))}
            />
          </div>

          <div className="space-y-2">
            <Label>Format</Label>
            <div className="grid grid-cols-2 gap-2">
              {TOGGLES.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={Boolean(options[key])}
                  onClick={() => toggle(key)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    options[key]
                      ? "border-primary bg-accent"
                      : "hover:bg-accent/50"
                  }`}
                >
                  {label}
                </button>
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
          <div className="divide-border max-h-[460px] divide-y overflow-auto rounded-lg border">
            {uuids.map((uuid, index) => (
              <div
                key={`${uuid}-${index}`}
                className="hover:bg-accent/40 flex items-center justify-between gap-2 px-3 py-2"
              >
                <code className="font-mono text-sm break-all">{uuid}</code>
                <CopyButton value={uuid} iconOnly variant="ghost" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

import {
  DEFAULT_PASSWORD_OPTIONS,
  estimateStrength,
  generatePassword,
  MAX_LENGTH,
  MIN_LENGTH,
  type PasswordOptions,
  type PasswordStrength,
} from "@/lib/generators/password";
import { useClientSeed } from "@/hooks/use-client-seed";
import { clamp } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { CopyButton } from "@/components/shared/copy-button";

const TOGGLES: { key: keyof PasswordOptions; label: string }[] = [
  { key: "uppercase", label: "A-Z" },
  { key: "lowercase", label: "a-z" },
  { key: "numbers", label: "0-9" },
  { key: "symbols", label: "!@#$" },
  { key: "excludeAmbiguous", label: "No look-alikes" },
];

const STRENGTH_STYLE: Record<PasswordStrength, { label: string; bar: string; width: string }> = {
  weak: { label: "Weak", bar: "bg-destructive", width: "w-1/4" },
  fair: { label: "Fair", bar: "bg-amber-500", width: "w-2/4" },
  strong: { label: "Strong", bar: "bg-lime-500", width: "w-3/4" },
  excellent: { label: "Excellent", bar: "bg-emerald-500", width: "w-full" },
};

/** Generate a password, capturing the "no charset selected" error as state. */
function generate(options: PasswordOptions): { password: string; error?: string } {
  try {
    return { password: generatePassword(options), error: undefined };
  } catch (err) {
    return {
      password: "",
      error: err instanceof Error ? err.message : "Could not generate",
    };
  }
}

/** Stable, so the seed runs exactly once. */
const seedPassword = () => generate(DEFAULT_PASSWORD_OPTIONS);

export function PasswordTool() {
  const [options, setOptions] = useState<PasswordOptions>(DEFAULT_PASSWORD_OPTIONS);
  // Client-only: crypto is non-deterministic, so the server cannot render
  // this without the two disagreeing at hydration.
  const [result, setResult] = useClientSeed<{ password: string; error?: string }>(
    seedPassword,
    { password: "" },
  );
  const { password, error } = result;

  // Apply an options change and regenerate from the new options in one go.
  const apply = (next: PasswordOptions) => {
    setOptions(next);
    setResult(generate(next));
  };

  const regenerate = () => setResult(generate(options));

  const setLength = (length: number) =>
    apply({ ...options, length: clamp(length, MIN_LENGTH, MAX_LENGTH) });

  const toggle = (key: keyof PasswordOptions) =>
    apply({ ...options, [key]: !options[key] });

  const strength = estimateStrength(options);
  const style = STRENGTH_STYLE[strength.label];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardContent className="space-y-3">
          <div className="bg-muted/50 flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
            <code className="font-mono text-lg break-all">
              {password || error || "-"}
            </code>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Regenerate"
                onClick={regenerate}
              >
                <RefreshCw />
              </Button>
              <CopyButton value={password} disabled={!password} />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
              <div className={`h-full ${style.bar} ${style.width} transition-all`} />
            </div>
            <div className="text-muted-foreground flex justify-between text-xs">
              <span>{style.label}</span>
              <span>~{strength.bits} bits of entropy</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="pw-length">Length</Label>
              <span className="text-sm font-medium tabular-nums">{options.length}</span>
            </div>
            <Slider
              id="pw-length"
              min={MIN_LENGTH}
              max={MAX_LENGTH}
              step={1}
              value={[options.length]}
              onValueChange={([value]) => setLength(value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Include</Label>
            <div className="flex flex-wrap gap-2">
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
        </CardContent>
      </Card>
    </div>
  );
}

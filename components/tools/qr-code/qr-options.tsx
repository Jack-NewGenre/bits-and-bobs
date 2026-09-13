"use client";

import {
  ERROR_LEVELS,
  MAX_MARGIN,
  MIN_MARGIN,
  MODULE_SHAPES,
  type QrSettings,
} from "@/lib/qr";
import { Label } from "@/components/ui/label";
import { PillButton } from "@/components/shared/pill-button";
import { SliderRow } from "@/components/shared/slider-row";

const SIZES = [256, 512, 1024] as const;

interface QrOptionsProps {
  settings: QrSettings;
  onChange: (settings: QrSettings) => void;
}

export function QrOptions({ settings, onChange }: QrOptionsProps) {
  const set = <K extends keyof QrSettings>(key: K, value: QrSettings[K]) =>
    onChange({ ...settings, [key]: value });

  const level = ERROR_LEVELS.find((entry) => entry.value === settings.ecc);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-xs">Module shape</Label>
        <div className="grid grid-cols-3 gap-2">
          {MODULE_SHAPES.map(({ value, label }) => (
            <PillButton
              key={value}
              active={settings.shape === value}
              ariaPressed={settings.shape === value}
              onClick={() => set("shape", value)}
            >
              {label}
            </PillButton>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">
          The three corner squares stay solid whatever you pick. They are how
          a scanner finds the code in the first place.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Error correction</Label>
        <div className="grid grid-cols-4 gap-2">
          {ERROR_LEVELS.map(({ value, label }) => (
            <PillButton
              key={value}
              active={settings.ecc === value}
              ariaPressed={settings.ecc === value}
              onClick={() => set("ecc", value)}
            >
              {label}
            </PillButton>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">
          {level?.recovers}, how much of the code can be scratched, covered or
          printed badly and still read. More correction means a denser code.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs" htmlFor="qr-fg">
            Foreground
          </Label>
          <div className="flex items-center gap-2">
            <input
              id="qr-fg"
              type="color"
              aria-label="Foreground colour"
              value={settings.foreground}
              onChange={(event) => set("foreground", event.target.value)}
              className="size-9 shrink-0 cursor-pointer rounded-md border bg-transparent p-0"
            />
            <code className="text-muted-foreground font-mono text-xs">
              {settings.foreground}
            </code>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs" htmlFor="qr-bg">
            Background
          </Label>
          <div className="flex items-center gap-2">
            <input
              id="qr-bg"
              type="color"
              aria-label="Background colour"
              value={settings.background}
              onChange={(event) => set("background", event.target.value)}
              className="size-9 shrink-0 cursor-pointer rounded-md border bg-transparent p-0"
            />
            <code className="text-muted-foreground font-mono text-xs">
              {settings.background}
            </code>
          </div>
        </div>
      </div>

      <SliderRow
        label="Quiet zone"
        value={settings.margin}
        min={MIN_MARGIN}
        max={MAX_MARGIN}
        onChange={(margin) => set("margin", margin)}
      />

      <div className="space-y-2">
        <Label className="text-xs">PNG size</Label>
        <div className="grid grid-cols-3 gap-2">
          {SIZES.map((size) => (
            <PillButton
              key={size}
              active={settings.size === size}
              ariaPressed={settings.size === size}
              onClick={() => set("size", size)}
            >
              {size}px
            </PillButton>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import {
  ERROR_LEVELS,
  MAX_MARGIN,
  MIN_MARGIN,
  MODULE_SHAPES,
  type QrSettings,
} from "@/lib/generators/qr";
import { Label } from "@/components/ui/label";
import { SliderRow } from "@/components/atoms/slider-row";
import { OptionGroup } from "@/components/molecules/option-group";

const SIZE_CHOICES = [256, 512, 1024].map((size) => ({
  value: size,
  label: `${size}px`,
}));

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
      <OptionGroup
        label="Module shape"
        choices={MODULE_SHAPES}
        value={settings.shape}
        onChange={(shape) => set("shape", shape)}
        columns={3}
        hint="The three corner squares stay solid whatever you pick. They are how a scanner finds the code in the first place."
      />

      <OptionGroup
        label="Error correction"
        choices={ERROR_LEVELS}
        value={settings.ecc}
        onChange={(ecc) => set("ecc", ecc)}
        columns={4}
        hint={`${level?.recovers}, how much of the code can be scratched, covered or printed badly and still read. More correction means a denser code.`}
      />

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

      <OptionGroup
        label="PNG size"
        choices={SIZE_CHOICES}
        value={settings.size}
        onChange={(size) => set("size", size)}
        columns={3}
      />
    </div>
  );
}

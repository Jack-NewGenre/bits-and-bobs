"use client";

import { ScanSearch } from "lucide-react";

import { MAX_TOLERANCE } from "@/lib/image/backdrop";
import { MAX_GAP, type DetectSettings } from "@/lib/image/detect-pieces";
import { Button } from "@/components/ui/button";
import { SliderRow } from "@/components/atoms/slider-row";
import { OptionGroup } from "@/components/molecules/option-group";

interface CutOptionsProps {
  settings: DetectSettings;
  onSettingsChange: (settings: DetectSettings) => void;
  onDetect: () => void;
  removeBackdrop: boolean;
  onRemoveBackdropChange: (remove: boolean) => void;
  /** Off until the backdrop is known, as there is nothing yet to remove. */
  canRemoveBackdrop: boolean;
}

/** How pieces are found, and whether the backdrop is cleared from each cut-out. */
export function CutOptions({
  settings,
  onSettingsChange,
  onDetect,
  removeBackdrop,
  onRemoveBackdropChange,
  canRemoveBackdrop,
}: CutOptionsProps) {
  const set = (key: keyof DetectSettings) => (value: number) =>
    onSettingsChange({ ...settings, [key]: value });

  return (
    <div className="space-y-4">
      <SliderRow
        label="Background tolerance"
        value={settings.tolerance}
        min={0}
        max={MAX_TOLERANCE}
        onChange={set("tolerance")}
      />
      <SliderRow
        label="Join pieces closer than (px)"
        value={settings.gap}
        min={0}
        max={MAX_GAP}
        onChange={set("gap")}
      />
      <Button variant="outline" className="w-full" onClick={onDetect}>
        <ScanSearch />
        Find pieces again
      </Button>
      <p className="text-muted-foreground text-xs">
        Finding pieces again replaces every box, including any you have drawn.
      </p>
      <OptionGroup
        label="Background"
        value={removeBackdrop ? "remove" : "keep"}
        onChange={(choice) => onRemoveBackdropChange(choice === "remove")}
        choices={[
          { value: "keep", label: "Keep" },
          {
            value: "remove",
            label: "Make transparent",
            disabled: !canRemoveBackdrop,
          },
        ]}
        hint="Clears the backdrop around each piece, leaving matching colour inside it alone."
      />
    </div>
  );
}

export type { CutOptionsProps };

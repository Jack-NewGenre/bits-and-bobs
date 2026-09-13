"use client";

import {
  MAX_PADDING,
  MAX_THRESHOLD,
  type TrimSettings,
} from "@/lib/image/trim";
import { SliderRow } from "@/components/shared/slider-row";

interface ClipOptionsProps {
  settings: TrimSettings;
  onChange: (settings: TrimSettings) => void;
}

export function ClipOptions({ settings, onChange }: ClipOptionsProps) {
  const setField = <K extends keyof TrimSettings>(
    key: K,
    value: TrimSettings[K],
  ) => onChange({ ...settings, [key]: value });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <SliderRow
          label="Edge threshold"
          value={settings.threshold}
          min={0}
          max={MAX_THRESHOLD}
          onChange={(value) => setField("threshold", value)}
        />
        <p className="text-muted-foreground text-xs">
          Ignore pixels this faint when deciding where the content ends. Raise
          it to cut off a soft, near-invisible fringe.
        </p>
      </div>

      <div className="space-y-2">
        <SliderRow
          label="Padding"
          value={settings.padding}
          min={0}
          max={MAX_PADDING}
          onChange={(value) => setField("padding", value)}
        />
        <p className="text-muted-foreground text-xs">
          Keep a transparent margin of this many pixels around the content.
        </p>
      </div>
    </div>
  );
}

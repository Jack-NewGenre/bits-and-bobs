"use client";

import {
  DEFAULT_TRANSFORM_SETTINGS,
  type TransformSettings,
} from "@/lib/image/transform";
import { MAX_COLOURS } from "@/lib/image/quantise";
import { resolveFormat } from "@/lib/image/image-output";
import { Label } from "@/components/ui/label";
import { FormatOptions } from "@/components/shared/format-options";
import { SliderRow } from "@/components/atoms/slider-row";
import { TransformTool } from "@/components/shared/transform-tool";

const DEFAULTS: TransformSettings = {
  ...DEFAULT_TRANSFORM_SETTINGS,
  format: "source",
  quality: 78,
};

/** PNG ignores quality, so its only real lever is having fewer colours. */
function ColourReduction({
  settings,
  onChange,
  sourceType,
}: {
  settings: TransformSettings;
  onChange: (settings: TransformSettings) => void;
  sourceType?: string;
}) {
  if (resolveFormat(settings.format, sourceType) !== "image/png") return null;

  return (
    <div className="space-y-2">
      <Label className="text-xs">Colour reduction</Label>
      <SliderRow
        label={settings.colours === 0 ? "Off" : `${settings.colours} colours`}
        value={settings.colours}
        min={0}
        max={MAX_COLOURS}
        onChange={(colours) => onChange({ ...settings, colours })}
      />
      <p className="text-muted-foreground text-xs">
        PNG is lossless, so quality does nothing to it. What shrinks a PNG is
        having fewer distinct colours to store, so flat graphics survive this
        very well, photographs do not.
      </p>
    </div>
  );
}

export function ImageCompressorTool() {
  return (
    <TransformTool
      defaultSettings={DEFAULTS}
      verb="Compressing"
      suffix="-compressed"
      zipFilename="compressed-images.zip"
      dropzoneHint="PNG, JPG or WebP · up to 25MB · compressed on your device"
      showSaving
      renderOptions={(settings, onChange, item) => (
        <div className="space-y-4">
          <FormatOptions
            format={settings.format}
            quality={settings.quality}
            matte={settings.matte}
            sourceType={item.file.type}
            onFormatChange={(format) => onChange({ ...settings, format })}
            onQualityChange={(quality) => onChange({ ...settings, quality })}
            onMatteChange={(matte) => onChange({ ...settings, matte })}
          />
          <ColourReduction
            settings={settings}
            onChange={onChange}
            sourceType={item.file.type}
          />
          <p className="text-muted-foreground text-xs">
            WebP usually beats both JPG and PNG at the same quality, worth
            trying if the format is yours to choose.
          </p>
        </div>
      )}
    />
  );
}

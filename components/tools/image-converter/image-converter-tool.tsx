"use client";

import {
  DEFAULT_TRANSFORM_SETTINGS,
  type TransformSettings,
} from "@/lib/image/transform";
import { FormatOptions } from "@/components/molecules/format-options";
import { TransformTool } from "@/components/shared/transform-tool";

const DEFAULTS: TransformSettings = {
  ...DEFAULT_TRANSFORM_SETTINGS,
  format: "image/png",
  quality: 92,
};

export function ImageConverterTool() {
  return (
    <TransformTool
      defaultSettings={DEFAULTS}
      verb="Converting"
      suffix=""
      zipFilename="converted-images.zip"
      dropzoneHint="PNG, JPG or WebP · up to 25MB · converted on your device"
      renderOptions={(settings, onChange, item) => (
        <FormatOptions
          format={settings.format}
          quality={settings.quality}
          matte={settings.matte}
          sourceType={item.file.type}
          onFormatChange={(format) => onChange({ ...settings, format })}
          onQualityChange={(quality) => onChange({ ...settings, quality })}
          onMatteChange={(matte) => onChange({ ...settings, matte })}
        />
      )}
    />
  );
}

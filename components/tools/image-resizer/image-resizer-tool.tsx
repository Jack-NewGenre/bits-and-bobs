"use client";

import { DEFAULT_TRANSFORM_SETTINGS } from "@/lib/image/transform";
import { TransformTool } from "@/components/shared/transform-tool";
import { ResizeOptions } from "@/components/tools/image-resizer/resize-options";

export function ImageResizerTool() {
  return (
    <TransformTool
      defaultSettings={DEFAULT_TRANSFORM_SETTINGS}
      verb="Resizing"
      suffix="-resized"
      zipFilename="resized-images.zip"
      dropzoneHint="PNG, JPG or WebP · up to 25MB · resized on your device"
      renderOptions={(settings, onChange, item) => (
        <ResizeOptions
          settings={settings}
          onChange={onChange}
          sourceWidth={item.sourceWidth}
          sourceHeight={item.sourceHeight}
          sourceType={item.file.type}
        />
      )}
    />
  );
}

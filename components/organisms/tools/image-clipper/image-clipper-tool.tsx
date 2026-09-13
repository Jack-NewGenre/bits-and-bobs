"use client";

import { useImageToolQueue } from "@/hooks/use-image-tool-queue";
import {
  DEFAULT_TRIM_SETTINGS,
  trimImage,
  type TrimResult,
  type TrimSettings,
} from "@/lib/image/trim";
import { toPngName } from "@/lib/download";
import { ImageToolShell } from "@/components/organisms/image-tool-shell";
import { ClipResultPanel } from "@/components/organisms/tools/image-clipper/clip-result-panel";

// Stable processor: the queue's first pass uses a plain edge-to-edge trim;
// the result panel re-clips live as the user adjusts the queue.settings.
const clipWithDefaults = (
  file: File,
  onProgress: (progress: { fraction: number }) => void,
  signal: AbortSignal,
) => {
  onProgress({ fraction: 0.2 });
  return trimImage(file, DEFAULT_TRIM_SETTINGS, { signal });
};

export function ImageClipperTool() {
  const queue = useImageToolQueue<TrimSettings, TrimResult>({
    processor: clipWithDefaults,
    defaultSettings: DEFAULT_TRIM_SETTINGS,
    processingLabel: "Clipping…",
    downloadAll: {
      actionLabel: "Clipping",
      zipFilename: "clipped-images.zip",
      buildEntry: async (item, currentSettings) => {
        const { blob } = await trimImage(item.file, currentSettings);
        return { name: toPngName(item.name), blob };
      },
    },
  });

  return (
    <ImageToolShell
      queue={queue}
      dropzoneHint="PNG, JPG or WebP · up to 25MB · cropped on your device"
      emptyStateLabel="Clipping… results will appear here."
      transparentThumbnails
      resultPanel={
        queue.selectedItem && (
          <ClipResultPanel
            key={queue.selectedItem.id}
            item={queue.selectedItem}
            settings={queue.settings}
            onSettingsChange={queue.setSettings}
          />
        )
      }
    />
  );
}

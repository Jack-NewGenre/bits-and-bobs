"use client";

import { useEffect } from "react";

import { useImageToolQueue } from "@/hooks/use-image-tool-queue";
import {
  removeImageBackground,
  type CutoutResult,
} from "@/lib/image/background-removal";
import {
  DEFAULT_BACKGROUND_SETTINGS,
  type BackgroundSettings,
} from "@/lib/image/composite";
import { compositeInWorker } from "@/lib/workers/image-worker-client";
import { toPngName } from "@/lib/download";
import { ImageToolShell } from "@/components/organisms/image-tool-shell";
import { ResultPanel } from "@/components/organisms/tools/background-removal/result-panel";

// Stable processor: removal runs once per image; the background is applied
// afterwards in the result panel, which is far cheaper than re-segmenting.
const removeBackground = (
  file: File,
  onProgress: (progress: { fraction: number; label?: string }) => void,
  signal: AbortSignal,
) =>
  removeImageBackground(file, {
    onProgress: ({ stage, fraction }) =>
      onProgress({
        fraction,
        label: stage === "fetching" ? "Loading model…" : undefined,
      }),
    signal,
  });

export function BackgroundRemovalTool() {
  const queue = useImageToolQueue<BackgroundSettings, CutoutResult>({
    processor: removeBackground,
    defaultSettings: DEFAULT_BACKGROUND_SETTINGS,
    processingLabel: "Removing background…",
    downloadAll: {
      actionLabel: "Preparing",
      zipFilename: "backgrounds-removed.zip",
      // Re-composite so the zip honours the chosen background, rather than
      // silently shipping the raw transparent cutouts.
      buildEntry: async (item, currentSettings, cached) => {
        const blob =
          cached ??
          (await compositeInWorker(item.result.blob, currentSettings)).blob;
        return { name: toPngName(item.name), blob };
      },
    },
  });

  // Own the background image object URL's lifecycle here, where queue.settings
  // outlive the result panel: revoke it when it's replaced or on unmount.
  useEffect(() => {
    const url = queue.settings.imageUrl;
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [queue.settings.imageUrl]);

  return (
    <ImageToolShell
      queue={queue}
      dropzoneHint="PNG, JPG or WebP · up to 25MB · removed on your device"
      emptyStateLabel="Processing… results will appear here."
      transparentThumbnails
      resultPanel={
        queue.selectedItem && (
          <ResultPanel
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

"use client";

import { useImageToolQueue } from "@/hooks/use-image-tool-queue";
import {
  enhancedFileName,
  type EnhanceResult,
  type EnhanceSettings,
} from "@/lib/image/enhance";
import { DEFAULT_ENHANCE_SETTINGS } from "@/lib/image/enhance-presets";
import {
  enhanceInWorker,
  workerConcurrency,
} from "@/lib/workers/image-worker-client";
import { ImageToolShell } from "@/components/organisms/image-tool-shell";
import { EnhanceResultPanel } from "@/components/organisms/tools/image-enhancer/enhance-result-panel";

// Stable processor: the queue's first pass uses balanced defaults; the result
// panel reuses that pass until the user tweaks the queue.settings.
const enhanceWithDefaults = (
  file: File,
  onProgress: (progress: { fraction: number }) => void,
  signal: AbortSignal,
) =>
  enhanceInWorker(file, DEFAULT_ENHANCE_SETTINGS, {
    onProgress: ({ fraction }) => onProgress({ fraction }),
    signal,
  });

export function ImageEnhancerTool() {
  const queue = useImageToolQueue<EnhanceSettings, EnhanceResult>({
    processor: enhanceWithDefaults,
    // Worker-backed, so a batch can spread across the pool.
    concurrency: workerConcurrency,
    defaultSettings: DEFAULT_ENHANCE_SETTINGS,
    processingLabel: "Enhancing…",
    downloadAll: {
      actionLabel: "Enhancing",
      zipFilename: "enhanced-images.zip",
      buildEntry: async (item, currentSettings, cached) => {
        const blob =
          cached ?? (await enhanceInWorker(item.file, currentSettings)).blob;
        return { name: enhancedFileName(item.name, blob), blob };
      },
    },
  });

  return (
    <ImageToolShell
      queue={queue}
      dropzoneHint="PNG, JPG or WebP · up to 25MB · upscaled & sharpened on your device"
      emptyStateLabel="Enhancing… results will appear here."
      resultPanel={
        queue.selectedItem && (
          <EnhanceResultPanel
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

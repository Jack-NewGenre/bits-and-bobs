"use client";

import { useImageToolQueue } from "@/hooks/use-image-tool-queue";
import {
  DEFAULT_VECTORIZE_SETTINGS,
  svgFileName,
  type VectorizeResult,
  type VectorizeSettings,
} from "@/lib/image/vectorize";
import {
  vectorizeInWorker,
  workerConcurrency,
} from "@/lib/workers/image-worker-client";
import { ImageToolShell } from "@/components/organisms/image-tool-shell";
import { VectorizeResultPanel } from "@/components/organisms/tools/png-to-svg/vectorize-result-panel";

// Stable processor: the queue's first pass uses balanced defaults; the result
// panel reuses that pass until the user tweaks the queue.settings.
const traceWithDefaults = (
  file: File,
  onProgress: (progress: { fraction: number }) => void,
  signal: AbortSignal,
) =>
  vectorizeInWorker(file, DEFAULT_VECTORIZE_SETTINGS, {
    onProgress: ({ fraction }) => onProgress({ fraction }),
    signal,
  });

export function PngToSvgTool() {
  const queue = useImageToolQueue<VectorizeSettings, VectorizeResult>({
    processor: traceWithDefaults,
    // Worker-backed, so a batch can spread across the pool.
    concurrency: workerConcurrency,
    defaultSettings: DEFAULT_VECTORIZE_SETTINGS,
    processingLabel: "Tracing…",
    downloadAll: {
      actionLabel: "Tracing",
      zipFilename: "vectorized-images.zip",
      buildEntry: async (item, currentSettings, cached) => {
        const blob =
          cached ?? (await vectorizeInWorker(item.file, currentSettings)).blob;
        return { name: svgFileName(item.name), blob };
      },
    },
  });

  return (
    <ImageToolShell
      queue={queue}
      dropzoneHint="PNG, JPG or WebP · up to 25MB · traced to SVG on your device"
      emptyStateLabel="Tracing… results will appear here."
      resultPanel={
        queue.selectedItem && (
          <VectorizeResultPanel
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

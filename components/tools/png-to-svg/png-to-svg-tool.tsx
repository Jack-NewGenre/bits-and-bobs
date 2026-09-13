"use client";

import { useImageToolQueue } from "@/hooks/use-image-tool-queue";
import {
  DEFAULT_VECTORIZE_SETTINGS,
  svgFileName,
  type VectorizeResult,
  type VectorizeSettings,
} from "@/lib/image/vectorize";
import { vectorizeInWorker } from "@/lib/workers/image-worker-client";
import { ImageToolShell } from "@/components/shared/image-tool-shell";
import { VectorizeResultPanel } from "@/components/tools/png-to-svg/vectorize-result-panel";

// Stable processor: the queue's first pass uses balanced defaults; the result
// panel reuses that pass until the user tweaks the settings.
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
  const {
    items,
    addFiles,
    removeItem,
    retryItem,
    clear,
    setPinnedId,
    settings,
    setSettings,
    statusLabel,
    doneItems,
    selectedItem,
    handleReject,
    handleDownloadAll,
  } = useImageToolQueue<VectorizeSettings, VectorizeResult>({
    processor: traceWithDefaults,
    defaultSettings: DEFAULT_VECTORIZE_SETTINGS,
    processingLabel: "Tracing…",
    downloadAll: {
      actionLabel: "Tracing",
      zipFilename: "vectorized-images.zip",
      buildEntry: async (item, currentSettings) => {
        const { blob } = await vectorizeInWorker(item.file, currentSettings);
        return { name: svgFileName(item.name), blob };
      },
    },
  });

  return (
    <ImageToolShell
      items={items}
      statusLabel={statusLabel}
      selectedId={selectedItem?.id}
      onSelect={setPinnedId}
      onRemove={removeItem}
      onRetry={retryItem}
      onFiles={addFiles}
      onReject={handleReject}
      onClear={clear}
      dropzoneHint="PNG, JPG or WebP · up to 25MB · traced to SVG on your device"
      doneCount={doneItems.length}
      onDownloadAll={handleDownloadAll}
      emptyStateLabel="Tracing… results will appear here."
      resultPanel={
        selectedItem && (
          <VectorizeResultPanel
            key={selectedItem.id}
            item={selectedItem}
            settings={settings}
            onSettingsChange={setSettings}
          />
        )
      }
    />
  );
}

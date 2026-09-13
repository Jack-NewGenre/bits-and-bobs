"use client";

import { useImageToolQueue } from "@/hooks/use-image-tool-queue";
import {
  enhancedFileName,
  type EnhanceResult,
  type EnhanceSettings,
} from "@/lib/image/enhance";
import { DEFAULT_ENHANCE_SETTINGS } from "@/lib/image/enhance-presets";
import { enhanceInWorker } from "@/lib/workers/image-worker-client";
import { ImageToolShell } from "@/components/shared/image-tool-shell";
import { EnhanceResultPanel } from "@/components/tools/image-enhancer/enhance-result-panel";

// Stable processor: the queue's first pass uses balanced defaults; the result
// panel reuses that pass until the user tweaks the settings.
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
  } = useImageToolQueue<EnhanceSettings, EnhanceResult>({
    processor: enhanceWithDefaults,
    defaultSettings: DEFAULT_ENHANCE_SETTINGS,
    processingLabel: "Enhancing…",
    downloadAll: {
      actionLabel: "Enhancing",
      zipFilename: "enhanced-images.zip",
      buildEntry: async (item, currentSettings) => {
        const { blob } = await enhanceInWorker(item.file, currentSettings);
        return { name: enhancedFileName(item.name, blob), blob };
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
      dropzoneHint="PNG, JPG or WebP · up to 25MB · upscaled & sharpened on your device"
      doneCount={doneItems.length}
      onDownloadAll={handleDownloadAll}
      emptyStateLabel="Enhancing… results will appear here."
      resultPanel={
        selectedItem && (
          <EnhanceResultPanel
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

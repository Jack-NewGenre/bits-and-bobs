"use client";

import { useImageToolQueue } from "@/hooks/use-image-tool-queue";
import {
  DEFAULT_ENHANCE_SETTINGS,
  enhanceImage,
  type EnhanceSettings,
} from "@/lib/enhance";
import { extensionForType, withSuffix } from "@/lib/download";
import { ImageToolShell } from "@/components/shared/image-tool-shell";
import { EnhanceResultPanel } from "@/components/tools/image-enhancer/enhance-result-panel";

// Stable processor: the queue's first pass uses balanced defaults; the result
// panel then re-enhances live as the user tweaks the settings.
const enhanceWithDefaults = (
  file: File,
  onProgress: (fraction: number) => void,
) =>
  enhanceImage(file, DEFAULT_ENHANCE_SETTINGS, {
    onProgress: ({ fraction }) => onProgress(fraction),
  });

export function ImageEnhancerTool() {
  const {
    items,
    addFiles,
    removeItem,
    clear,
    setPinnedId,
    settings,
    setSettings,
    statusLabel,
    doneItems,
    selectedItem,
    handleReject,
    handleDownloadAll,
  } = useImageToolQueue<EnhanceSettings>({
    processor: enhanceWithDefaults,
    defaultSettings: DEFAULT_ENHANCE_SETTINGS,
    processingLabel: "Enhancing…",
    downloadAll: {
      actionLabel: "Enhancing",
      zipFilename: "enhanced-images.zip",
      buildEntry: async (item, currentSettings) => {
        const blob = await enhanceImage(item.file, currentSettings);
        return {
          name: withSuffix(item.name, "-enhanced", extensionForType(blob.type)),
          blob,
        };
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

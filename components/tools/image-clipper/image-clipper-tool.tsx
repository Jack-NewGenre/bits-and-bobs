"use client";

import { useImageToolQueue } from "@/hooks/use-image-tool-queue";
import {
  DEFAULT_TRIM_SETTINGS,
  trimImage,
  type TrimResult,
  type TrimSettings,
} from "@/lib/trim";
import { toPngName } from "@/lib/download";
import { ImageToolShell } from "@/components/shared/image-tool-shell";
import { ClipResultPanel } from "@/components/tools/image-clipper/clip-result-panel";

// Stable processor: the queue's first pass uses a plain edge-to-edge trim;
// the result panel re-clips live as the user adjusts the settings.
const clipWithDefaults = (
  file: File,
  onProgress: (progress: { fraction: number }) => void,
  signal: AbortSignal,
) => {
  onProgress({ fraction: 0.2 });
  return trimImage(file, DEFAULT_TRIM_SETTINGS, { signal });
};

export function ImageClipperTool() {
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
  } = useImageToolQueue<TrimSettings, TrimResult>({
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
      items={items}
      statusLabel={statusLabel}
      selectedId={selectedItem?.id}
      onSelect={setPinnedId}
      onRemove={removeItem}
      onRetry={retryItem}
      onFiles={addFiles}
      onReject={handleReject}
      onClear={clear}
      dropzoneHint="PNG, JPG or WebP · up to 25MB · cropped on your device"
      doneCount={doneItems.length}
      onDownloadAll={handleDownloadAll}
      emptyStateLabel="Clipping… results will appear here."
      transparentThumbnails
      resultPanel={
        selectedItem && (
          <ClipResultPanel
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

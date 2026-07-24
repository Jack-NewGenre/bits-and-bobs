"use client";

import { useImageToolQueue } from "@/hooks/use-image-tool-queue";
import {
  DEFAULT_VECTORIZE_SETTINGS,
  vectorizeImage,
  type VectorizeSettings,
} from "@/lib/vectorize";
import { withSuffix } from "@/lib/download";
import { ImageToolShell } from "@/components/shared/image-tool-shell";
import { VectorizeResultPanel } from "@/components/tools/png-to-svg/vectorize-result-panel";

// Stable processor: the queue's first pass uses balanced defaults; the result
// panel then re-traces live as the user tweaks the settings.
const traceWithDefaults = (
  file: File,
  onProgress: (fraction: number) => void,
) =>
  vectorizeImage(file, DEFAULT_VECTORIZE_SETTINGS, {
    onProgress: ({ fraction }) => onProgress(fraction),
  }).then(({ blob }) => blob);

export function PngToSvgTool() {
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
  } = useImageToolQueue<VectorizeSettings>({
    processor: traceWithDefaults,
    defaultSettings: DEFAULT_VECTORIZE_SETTINGS,
    processingLabel: "Tracing…",
    downloadAll: {
      actionLabel: "Tracing",
      zipFilename: "vectorized-images.zip",
      buildEntry: async (item, currentSettings) => {
        const { blob } = await vectorizeImage(item.file, currentSettings);
        return { name: withSuffix(item.name, "", "svg"), blob };
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

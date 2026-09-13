"use client";

import { useImageToolQueue } from "@/hooks/use-image-tool-queue";
import { simulateImage, type SimulateResult } from "@/lib/colour/colour-blindness";
import { ImageToolShell } from "@/components/organisms/image-tool-shell";
import {
  DEFAULT_VISION_SETTINGS,
  simulatedName,
  VisionResultPanel,
  type VisionSettings,
} from "@/components/organisms/tools/colour-blindness/vision-result-panel";

// Stable processor: the queue's first pass simulates the most common
// deficiency; the result panel re-renders live as the user switches type.
const simulateWithDefault = (
  file: File,
  onProgress: (progress: { fraction: number }) => void,
  signal: AbortSignal,
) => {
  onProgress({ fraction: 0.2 });
  return simulateImage(file, DEFAULT_VISION_SETTINGS.vision, { signal });
};

export function ColourBlindnessTool() {
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
  } = useImageToolQueue<VisionSettings, SimulateResult>({
    processor: simulateWithDefault,
    defaultSettings: DEFAULT_VISION_SETTINGS,
    processingLabel: "Simulating…",
    downloadAll: {
      actionLabel: "Simulating",
      zipFilename: "colour-blindness.zip",
      buildEntry: async (item, currentSettings) => {
        const { blob } = await simulateImage(item.file, currentSettings.vision);
        return { name: simulatedName(item.name, currentSettings.vision), blob };
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
      dropzoneHint="PNG, JPG or WebP · up to 25MB · simulated on your device"
      doneCount={doneItems.length}
      onDownloadAll={handleDownloadAll}
      emptyStateLabel="Simulating… results will appear here."
      resultPanel={
        selectedItem && (
          <VisionResultPanel
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

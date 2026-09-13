"use client";

import { useEffect } from "react";

import { useImageToolQueue } from "@/hooks/use-image-tool-queue";
import {
  removeImageBackground,
  type CutoutResult,
} from "@/lib/image/background-removal";
import {
  compositeWithSettings,
  DEFAULT_BACKGROUND_SETTINGS,
  type BackgroundSettings,
} from "@/lib/image/composite";
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
  } = useImageToolQueue<BackgroundSettings, CutoutResult>({
    processor: removeBackground,
    defaultSettings: DEFAULT_BACKGROUND_SETTINGS,
    processingLabel: "Removing background…",
    downloadAll: {
      actionLabel: "Preparing",
      zipFilename: "backgrounds-removed.zip",
      // Re-composite so the zip honours the chosen background, rather than
      // silently shipping the raw transparent cutouts.
      buildEntry: async (item, currentSettings) => {
        const { blob } = await compositeWithSettings(
          item.result.blob,
          currentSettings,
        );
        return { name: toPngName(item.name), blob };
      },
    },
  });

  // Own the background image object URL's lifecycle here, where settings
  // outlive the result panel: revoke it when it's replaced or on unmount.
  useEffect(() => {
    const url = settings.imageUrl;
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [settings.imageUrl]);

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
      dropzoneHint="PNG, JPG or WebP · up to 25MB · removed on your device"
      doneCount={doneItems.length}
      onDownloadAll={handleDownloadAll}
      emptyStateLabel="Processing… results will appear here."
      transparentThumbnails
      resultPanel={
        selectedItem && (
          <ResultPanel
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

"use client";

import { useImageToolQueue } from "@/hooks/use-image-tool-queue";
import { formatHex } from "@/lib/colour-format";
import {
  DEFAULT_PALETTE_SETTINGS,
  extractPalette,
  type PaletteResult,
  type PaletteSettings,
} from "@/lib/palette";
import { withSuffix } from "@/lib/download";
import { ImageToolShell } from "@/components/shared/image-tool-shell";
import { PaletteResultPanel } from "@/components/tools/palette-extractor/palette-result-panel";

// Stable processor: the queue's first pass pulls a default-sized palette;
// the result panel re-extracts live as the user asks for more or fewer.
const extractWithDefaults = (
  file: File,
  onProgress: (progress: { fraction: number }) => void,
  signal: AbortSignal,
) => {
  onProgress({ fraction: 0.3 });
  return extractPalette(file, DEFAULT_PALETTE_SETTINGS, { signal });
};

export function PaletteExtractorTool() {
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
  } = useImageToolQueue<PaletteSettings, PaletteResult>({
    processor: extractWithDefaults,
    defaultSettings: DEFAULT_PALETTE_SETTINGS,
    processingLabel: "Reading colours…",
    downloadAll: {
      actionLabel: "Reading",
      zipFilename: "palettes.zip",
      // A palette is text, so the zip holds the swatch list rather than
      // pictures of it.
      buildEntry: async (item, current) => {
        const { entries } = await extractPalette(item.file, current);
        const text = entries
          .map(
            (entry) =>
              `${formatHex(entry.colour)}  ${Math.round(entry.share * 100)}%`,
          )
          .join("\n");
        return {
          name: withSuffix(item.name, "-palette", "txt"),
          blob: new Blob([text], { type: "text/plain" }),
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
      onRetry={retryItem}
      onFiles={addFiles}
      onReject={handleReject}
      onClear={clear}
      dropzoneHint="PNG, JPG or WebP · up to 25MB · read on your device"
      doneCount={doneItems.length}
      onDownloadAll={handleDownloadAll}
      emptyStateLabel="Reading colours… results will appear here."
      resultPanel={
        selectedItem && (
          <PaletteResultPanel
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

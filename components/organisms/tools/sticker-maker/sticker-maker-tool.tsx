"use client";

import { useImageToolQueue } from "@/hooks/use-image-tool-queue";
import type { QueueProgress } from "@/hooks/use-image-queue";
import {
  removeImageBackground,
  type CutoutResult,
} from "@/lib/image/background-removal";
import {
  DEFAULT_STICKER_SETTINGS,
  isTransparentImage,
  stickerArtwork,
  stickerFromBlob,
  type StickerSettings,
} from "@/lib/image/sticker";
import { withSuffix } from "@/lib/download";
import { ImageToolShell } from "@/components/organisms/image-tool-shell";
import { ResultPanel } from "@/components/organisms/tools/sticker-maker/result-panel";

// Runs once per image. Artwork that already has a clear background is used as
// it is; anything else has its background removed first. The border and shadow
// are drawn afterwards in the result panel, so moving a slider never re-segments.
const cutOut = async (
  file: File,
  onProgress: (progress: QueueProgress) => void,
  signal: AbortSignal,
): Promise<CutoutResult> => {
  if (await isTransparentImage(file)) return { blob: file };
  return removeImageBackground(file, {
    onProgress: ({ stage, fraction }) =>
      onProgress({
        fraction,
        label: stage === "fetching" ? "Loading model…" : undefined,
      }),
    signal,
  });
};

export function StickerMakerTool() {
  const queue = useImageToolQueue<StickerSettings, CutoutResult>({
    processor: cutOut,
    defaultSettings: DEFAULT_STICKER_SETTINGS,
    processingLabel: "Cutting out…",
    downloadAll: {
      actionLabel: "Preparing",
      zipFilename: "stickers.zip",
      buildEntry: async (item, settings) => ({
        name: withSuffix(item.name, "-sticker", "png"),
        blob: await stickerFromBlob(
          stickerArtwork(item.file, item.result.blob, settings),
          settings,
        ),
      }),
    },
  });

  return (
    <ImageToolShell
      queue={queue}
      dropzoneHint="PNG, JPG or WebP · up to 25MB · made on your device"
      emptyStateLabel="Cutting out… your sticker will appear here."
      transparentThumbnails
      resultPanel={
        queue.selectedItem && (
          <ResultPanel
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

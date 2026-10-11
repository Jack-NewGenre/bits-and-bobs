"use client";

import { useLiveResult } from "@/hooks/use-live-result";
import type { DoneQueueItem } from "@/hooks/use-image-queue";
import type { CutoutResult } from "@/lib/image/background-removal";
import {
  stickerArtwork,
  stickerFromBlob,
  type StickerSettings,
} from "@/lib/image/sticker";
import { downloadBlob, withSuffix } from "@/lib/download";
import { formatBytes } from "@/lib/utils";
import { PreviewImage } from "@/components/atoms/preview-image";
import { ResultError } from "@/components/atoms/result-error";
import { DownloadButton } from "@/components/atoms/download-button";
import { ResultPanelShell } from "@/components/organisms/result-panel-shell";
import { StickerOptions } from "@/components/organisms/tools/sticker-maker/sticker-options";

const drawSticker = async (
  cutout: Blob,
  settings: StickerSettings,
  { signal }: { signal: AbortSignal },
) => ({ blob: await stickerFromBlob(cutout, settings, signal) });

interface ResultPanelProps {
  item: DoneQueueItem<CutoutResult>;
  settings: StickerSettings;
  onSettingsChange: (settings: StickerSettings) => void;
}

export function ResultPanel({
  item,
  settings,
  onSettingsChange,
}: ResultPanelProps) {
  const sticker = useLiveResult({
    source: stickerArtwork(item.file, item.result.blob, settings),
    settings,
    process: drawSticker,
  });
  const result = sticker.result;

  const handleDownload = () => {
    if (!result) return;
    downloadBlob(result.blob, withSuffix(item.name, "-sticker", "png"));
  };

  return (
    <ResultPanelShell
      title={item.name}
      footer={
        <DownloadButton
          onClick={handleDownload}
          busy={sticker.isProcessing}
          disabled={!result}
          label="Download PNG"
        />
      }
    >
      {sticker.url && (
        <PreviewImage
          src={sticker.url}
          alt={`${item.name} as a sticker`}
          transparent
          className={
            sticker.isProcessing ? "opacity-60 transition-opacity" : undefined
          }
        />
      )}
      {result && (
        <p className="text-muted-foreground text-xs">
          Output: PNG · {formatBytes(result.blob.size)}
        </p>
      )}
      {sticker.error && <ResultError message={sticker.error} />}
      <StickerOptions settings={settings} onChange={onSettingsChange} />
    </ResultPanelShell>
  );
}

"use client";

import { useLiveResult } from "@/hooks/use-live-result";
import type { DoneQueueItem } from "@/hooks/use-image-queue";
import type { CutoutResult } from "@/lib/image/background-removal";
import {
  compositeWithSettings,
  DEFAULT_BACKGROUND_SETTINGS,
  type BackgroundSettings,
} from "@/lib/image/composite";
import { downloadBlob, toPngName } from "@/lib/download";
import { formatBytes } from "@/lib/utils";
import { BeforeAfterSlider } from "@/components/molecules/before-after-slider";
import { ResultError } from "@/components/atoms/result-error";
import { DownloadButton } from "@/components/atoms/download-button";
import { ResultPanelShell } from "@/components/organisms/result-panel-shell";
import { BackgroundOptions } from "@/components/organisms/tools/background-removal/background-options";

const composite = (cutout: Blob, settings: BackgroundSettings) =>
  compositeWithSettings(cutout, settings);

interface ResultPanelProps {
  item: DoneQueueItem<CutoutResult>;
  settings: BackgroundSettings;
  onSettingsChange: (settings: BackgroundSettings) => void;
}

export function ResultPanel({
  item,
  settings,
  onSettingsChange,
}: ResultPanelProps) {
  const composited = useLiveResult({
    source: item.result.blob,
    settings,
    process: composite,
    // An untouched transparent result is exactly the cutout the queue already
    // produced, so there is nothing to composite or re-encode.
    seed: {
      result: item.result,
      url: item.resultUrl,
      matches:
        settings.mode === DEFAULT_BACKGROUND_SETTINGS.mode &&
        settings.feather === 0 &&
        !settings.trim,
    },
    debounceMs: 0,
  });
  const previewUrl = composited.url ?? item.resultUrl;
  const result = composited.result;

  const handleDownload = () => {
    if (!result) return;
    downloadBlob(result.blob, toPngName(item.name));
  };

  return (
    <ResultPanelShell
      title={item.name}
      footer={
        <DownloadButton
          onClick={handleDownload}
          busy={composited.isProcessing}
          disabled={!result}
          label="Download PNG"
        />
      }
    >
        {previewUrl && (
          <BeforeAfterSlider
            beforeUrl={item.originalUrl}
            afterUrl={previewUrl}
            beforeLabel="Original"
            afterLabel="Removed"
            showCheckerboard
            isStale={composited.isProcessing}
          />
        )}
        {result && (
          <p className="text-muted-foreground text-xs">
            Output: PNG · {formatBytes(result.blob.size)}
          </p>
        )}
        {composited.error && <ResultError message={composited.error} />}
        <BackgroundOptions settings={settings} onChange={onSettingsChange} />
    </ResultPanelShell>
  );
}

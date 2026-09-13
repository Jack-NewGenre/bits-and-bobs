"use client";


import { useLiveResult } from "@/hooks/use-live-result";
import type { ImageQueueItem } from "@/hooks/use-image-queue";
import {
  DEFAULT_TRIM_SETTINGS,
  trimImage,
  type TrimResult,
  type TrimSettings,
} from "@/lib/image/trim";
import { downloadBlob, toPngName } from "@/lib/download";
import { shallowEqual } from "@/lib/utils";
import { FileSummary } from "@/components/molecules/file-summary";
import { ResultError } from "@/components/atoms/result-error";
import { ClipOptions } from "@/components/organisms/tools/image-clipper/clip-options";
import { CropPreview } from "@/components/organisms/tools/image-clipper/crop-preview";
import { DownloadButton } from "@/components/atoms/download-button";
import { ResultPanelShell } from "@/components/organisms/result-panel-shell";

const clip = (
  file: File,
  settings: TrimSettings,
  { signal }: { signal: AbortSignal },
) => trimImage(file, settings, { signal });

/** Percentage of the original area the crop removed. */
function areaSaved(result: TrimResult): number {
  const before = result.sourceWidth * result.sourceHeight;
  if (before <= 0) return 0;
  return Math.max(0, Math.round((1 - (result.width * result.height) / before) * 100));
}

interface ClipResultPanelProps {
  item: ImageQueueItem<TrimResult>;
  settings: TrimSettings;
  onSettingsChange: (settings: TrimSettings) => void;
}

export function ClipResultPanel({
  item,
  settings,
  onSettingsChange,
}: ClipResultPanelProps) {
  const clipped = useLiveResult({
    source: item.file,
    settings,
    process: clip,
    seed: {
      result: item.result,
      url: item.resultUrl,
      matches: shallowEqual(settings, DEFAULT_TRIM_SETTINGS),
    },
  });
  const result = clipped.result;

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
          busy={clipped.isProcessing}
          disabled={!result}
          label="Download PNG"
        />
      }
    >
        <CropPreview
          src={item.originalUrl}
          result={result}
          isStale={clipped.isProcessing}
        />

        <div className="space-y-1">
          <FileSummary
            label="Input"
            width={item.sourceWidth}
            height={item.sourceHeight}
            type={item.file.type}
            bytes={item.file.size}
          />
          {result && (
            <FileSummary
              label="Output"
              width={result.width}
              height={result.height}
              type={result.blob.type}
              bytes={result.blob.size}
              extra={
                result.trimmed ? `${areaSaved(result)}% of the area removed` : undefined
              }
            />
          )}
          {result?.isEmpty && (
            <p className="text-muted-foreground text-xs">
              Every pixel is transparent, so there is no content to crop to.
            </p>
          )}
          {result && !result.trimmed && !result.isEmpty && (
            <p className="text-muted-foreground text-xs">
              No transparent margin to remove. The content already fills the
              image.
            </p>
          )}
          {clipped.error && <ResultError message={clipped.error} />}
        </div>

        <ClipOptions settings={settings} onChange={onSettingsChange} />
    </ResultPanelShell>
  );
}

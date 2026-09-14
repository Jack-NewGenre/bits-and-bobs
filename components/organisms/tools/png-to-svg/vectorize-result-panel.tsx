"use client";

import { useMemo } from "react";

import { useLiveResult } from "@/hooks/use-live-result";
import type { ImageQueueItem } from "@/hooks/use-image-queue";
import {
  countSvgPaths,
  DEFAULT_VECTORIZE_SETTINGS,
  svgFileName,
  type VectorizeResult,
  type VectorizeSettings,
} from "@/lib/image/vectorize";
import { vectorizeInWorker } from "@/lib/workers/image-worker-client";
import { downloadBlob } from "@/lib/download";
import { formatBytes, percentSmaller, shallowEqual } from "@/lib/utils";
import { DownloadButton } from "@/components/atoms/download-button";
import { ResultPanelShell } from "@/components/organisms/result-panel-shell";
import { CopyButton } from "@/components/atoms/copy-button";
import { ResultError } from "@/components/atoms/result-error";
import { VectorizeOptions } from "@/components/organisms/tools/png-to-svg/vectorize-options";
import { ZoomableComparison } from "@/components/molecules/zoomable-comparison";

/** Longest edge of the coarse trace shown while the full one runs. */
const PREVIEW_MAX_DIM = 480;

const trace = (
  file: File,
  settings: VectorizeSettings,
  { signal }: { signal: AbortSignal },
) => vectorizeInWorker(file, settings, { signal });

const tracePreview = (
  file: File,
  settings: VectorizeSettings,
  { signal }: { signal: AbortSignal },
) => vectorizeInWorker(file, settings, { signal, maxDim: PREVIEW_MAX_DIM });

/** Whole-percent size reduction the optimiser achieved. */
interface VectorizeResultPanelProps {
  item: ImageQueueItem<VectorizeResult>;
  settings: VectorizeSettings;
  onSettingsChange: (settings: VectorizeSettings) => void;
}

export function VectorizeResultPanel({
  item,
  settings,
  onSettingsChange,
}: VectorizeResultPanelProps) {
  const vectorized = useLiveResult({
    source: item.file,
    settings,
    process: trace,
    previewProcess: tracePreview,
    seed: {
      result: item.result,
      url: item.resultUrl,
      matches: shallowEqual(settings, DEFAULT_VECTORIZE_SETTINGS),
    },
  });
  const previewUrl = vectorized.url ?? item.resultUrl;
  const result = vectorized.result;
  // A preview trace is coarser than the real one: never copied or downloaded.
  const finalResult = vectorized.isPreview ? undefined : result;
  // Walking a multi-megabyte SVG on every render of the panel, including every
  // frame of a slider drag, for a number that only changes with the trace.
  const pathCount = useMemo(
    () => (finalResult ? countSvgPaths(finalResult.svg) : 0),
    [finalResult],
  );
  const isBusy = vectorized.isProcessing || vectorized.isPreview;

  const handleDownload = () => {
    if (!finalResult) return;
    downloadBlob(finalResult.blob, svgFileName(item.name));
  };

  return (
    <ResultPanelShell
      title={item.name}
      footerClassName="gap-2"
      footer={
        <>
          <DownloadButton
            onClick={handleDownload}
            busy={isBusy}
            disabled={!finalResult}
            label="Download SVG"
            className="flex-1"
          />
          <CopyButton
            value={() => finalResult?.svg ?? ""}
            label="Copy SVG"
            size="default"
            disabled={!finalResult || isBusy}
          />
        </>
      }
    >
        {previewUrl && (
          <ZoomableComparison
            beforeUrl={item.originalUrl}
            afterUrl={previewUrl}
            beforeLabel="Original"
            afterLabel="Vector"
            isStale={isBusy}
            caption="Drag to compare · zoom in to inspect the traced paths"
          />
        )}
        {vectorized.error ? (
          <ResultError message={vectorized.error} />
        ) : (
          <p className="text-muted-foreground text-xs">
            {finalResult ? (
              <>
                Output: SVG · {pathCount} paths ·{" "}
                {formatBytes(finalResult.blob.size)} ·{" "}
                {percentSmaller(finalResult.rawBytes, finalResult.blob.size, {
                  clampToZero: true,
                })}
                %
                smaller after optimising
              </>
            ) : (
              "Rendering the full-detail trace…"
            )}
          </p>
        )}
        <VectorizeOptions settings={settings} onChange={onSettingsChange} />
    </ResultPanelShell>
  );
}

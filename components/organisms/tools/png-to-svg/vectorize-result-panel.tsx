"use client";

import { useState } from "react";

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
import { formatBytes, shallowEqual } from "@/lib/utils";
import { DownloadButton } from "@/components/atoms/download-button";
import { ResultPanelShell } from "@/components/organisms/result-panel-shell";
import { BeforeAfterSlider } from "@/components/molecules/before-after-slider";
import { CopyButton } from "@/components/atoms/copy-button";
import { ResultError } from "@/components/atoms/result-error";
import { ZoomControl } from "@/components/atoms/zoom-control";
import { VectorizeOptions } from "@/components/organisms/tools/png-to-svg/vectorize-options";

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
function percentSaved(before: number, after: number): number {
  if (before <= 0) return 0;
  return Math.max(0, Math.round((1 - after / before) * 100));
}

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
  const [zoom, setZoom] = useState(1);
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
          <div className="space-y-2">
            <BeforeAfterSlider
              beforeUrl={item.originalUrl}
              afterUrl={previewUrl}
              beforeLabel="Original"
              afterLabel="Vector"
              zoom={zoom}
              isStale={isBusy}
            />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">
                Drag to compare · zoom in to inspect the traced paths
              </span>
              <ZoomControl zoom={zoom} onZoomChange={setZoom} />
            </div>
          </div>
        )}
        {vectorized.error ? (
          <ResultError message={vectorized.error} />
        ) : (
          <p className="text-muted-foreground text-xs">
            {finalResult ? (
              <>
                Output: SVG · {countSvgPaths(finalResult.svg)} paths ·{" "}
                {formatBytes(finalResult.blob.size)} ·{" "}
                {percentSaved(finalResult.rawBytes, finalResult.blob.size)}%
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

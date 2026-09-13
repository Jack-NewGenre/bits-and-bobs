"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { useLiveResult } from "@/hooks/use-live-result";
import type { ImageQueueItem } from "@/hooks/use-image-queue";
import {
  countSvgPaths,
  DEFAULT_VECTORIZE_SETTINGS,
  svgFileName,
  type VectorizeResult,
  type VectorizeSettings,
} from "@/lib/vectorize";
import { vectorizeInWorker } from "@/lib/workers/image-worker-client";
import { downloadBlob } from "@/lib/download";
import { formatBytes, shallowEqual } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BeforeAfterSlider } from "@/components/shared/before-after-slider";
import { CopyButton } from "@/components/shared/copy-button";
import { ResultError } from "@/components/shared/result-error";
import { ZoomControl } from "@/components/shared/zoom-control";
import { VectorizeOptions } from "@/components/tools/png-to-svg/vectorize-options";

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
    <Card>
      <CardHeader>
        <CardTitle className="truncate text-base">{item.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
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
      </CardContent>
      <CardFooter className="gap-2">
        <Button
          type="button"
          onClick={handleDownload}
          disabled={!finalResult || isBusy}
          className="flex-1"
        >
          {isBusy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Download SVG
        </Button>
        <CopyButton
          value={() => finalResult?.svg ?? ""}
          label="Copy SVG"
          size="default"
          disabled={!finalResult || isBusy}
        />
      </CardFooter>
    </Card>
  );
}

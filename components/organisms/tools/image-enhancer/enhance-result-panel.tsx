"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useLiveResult } from "@/hooks/use-live-result";
import type { ImageQueueItem } from "@/hooks/use-image-queue";
import {
  enhancedFileName,
  type EnhanceResult,
  type EnhanceSettings,
} from "@/lib/image/enhance";
import { DEFAULT_ENHANCE_SETTINGS } from "@/lib/image/enhance-presets";
import { enhanceInWorker } from "@/lib/workers/image-worker-client";
import { AI_SCALE, aiUpscale, canUseAi, isModelLoaded } from "@/lib/image/ai-upscale";
import { downloadBlob } from "@/lib/download";
import { shallowEqual } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BeforeAfterSlider } from "@/components/molecules/before-after-slider";
import { FileSummary } from "@/components/molecules/file-summary";
import { ResultError } from "@/components/atoms/result-error";
import { ZoomControl } from "@/components/atoms/zoom-control";
import { EnhanceOptions } from "@/components/organisms/tools/image-enhancer/enhance-options";

/** Longest edge of the quick stand-in shown while the full pass runs. */
const PREVIEW_MAX_DIM = 1400;

const enhanceFast = (
  file: File,
  settings: EnhanceSettings,
  { signal }: { signal: AbortSignal },
) => enhanceInWorker(file, settings, { signal });

/**
 * Upscale with the model, then run the ordinary canvas pass over its output
 * for tone, denoise and sharpening. The model enlarges by a fixed factor, so
 * the canvas covers only whatever enlargement is left to do.
 */
const enhanceWithAi = async (
  file: File,
  settings: EnhanceSettings,
  { signal }: { signal: AbortSignal },
) => {
  const toastId = isModelLoaded()
    ? undefined
    : toast.loading("Downloading the upscaling model, first use only…");

  try {
    const upscaled = await aiUpscale(file, { signal });
    if (toastId) toast.success("Upscaling model ready", { id: toastId });

    return await enhanceInWorker(upscaled, settings, {
      signal,
      scaleOverride: settings.scale / AI_SCALE,
    });
  } catch (error) {
    if (toastId) toast.dismiss(toastId);
    throw error;
  }
};

const enhancePreview = (
  file: File,
  settings: EnhanceSettings,
  { signal }: { signal: AbortSignal },
) => enhanceInWorker(file, settings, { signal, maxDim: PREVIEW_MAX_DIM });

interface EnhanceResultPanelProps {
  item: ImageQueueItem<EnhanceResult>;
  settings: EnhanceSettings;
  onSettingsChange: (settings: EnhanceSettings) => void;
}

export function EnhanceResultPanel({
  item,
  settings,
  onSettingsChange,
}: EnhanceResultPanelProps) {
  const [zoom, setZoom] = useState(1);

  // The queue measures the dropped file once; that is what the model's limit
  // has to be judged against, not whatever a previous pass produced.
  const aiAvailable =
    item.sourceWidth !== undefined && item.sourceHeight !== undefined
      ? canUseAi(item.sourceWidth, item.sourceHeight)
      : false;
  const useAi = settings.engine === "ai" && aiAvailable;

  const enhanced = useLiveResult({
    source: item.file,
    settings,
    // Both are stable module-level functions, so switching engines swaps the
    // reference and re-runs, which is exactly what should happen.
    process: useAi ? enhanceWithAi : enhanceFast,
    previewProcess: enhancePreview,
    seed: {
      result: item.result,
      url: item.resultUrl,
      matches: shallowEqual(settings, DEFAULT_ENHANCE_SETTINGS),
    },
  });

  const previewUrl = enhanced.url ?? item.resultUrl;
  const result = enhanced.result;
  // A preview blob is a downscaled stand-in: never measured, never downloaded.
  const finalResult = enhanced.isPreview ? undefined : result;
  const isBusy = enhanced.isProcessing || enhanced.isPreview;

  const handleDownload = () => {
    if (!finalResult) return;
    downloadBlob(
      finalResult.blob,
      enhancedFileName(item.name, finalResult.blob),
    );
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
              afterLabel="Enhanced"
              zoom={zoom}
              isStale={isBusy}
            />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">
                Drag to compare · zoom in to inspect detail
              </span>
              <ZoomControl zoom={zoom} onZoomChange={setZoom} />
            </div>
          </div>
        )}
        <div className="space-y-1">
          <FileSummary
            label="Input"
            width={item.sourceWidth}
            height={item.sourceHeight}
            type={item.file.type}
            bytes={item.file.size}
          />
          {finalResult ? (
            <FileSummary
              label="Output"
              width={finalResult.fullWidth}
              height={finalResult.fullHeight}
              type={finalResult.blob.type}
              bytes={finalResult.blob.size}
            />
          ) : enhanced.error ? (
            <ResultError message={enhanced.error} />
          ) : (
            <p className="text-muted-foreground text-xs">
              {useAi
                ? "Reconstructing detail with the AI upscaler…"
                : "Rendering full-quality output…"}
            </p>
          )}
        </div>
        <EnhanceOptions
          settings={settings}
          onChange={onSettingsChange}
          aiAvailable={aiAvailable}
          sourceType={item.file.type}
        />
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          onClick={handleDownload}
          disabled={!finalResult || isBusy}
          className="w-full"
        >
          {isBusy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Download
        </Button>
      </CardFooter>
    </Card>
  );
}

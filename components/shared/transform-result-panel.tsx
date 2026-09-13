"use client";

import { Download, Loader2 } from "lucide-react";

import { useLiveResult } from "@/hooks/use-live-result";
import type { ImageQueueItem } from "@/hooks/use-image-queue";
import {
  transformImage,
  type TransformResult,
  type TransformSettings,
} from "@/lib/image/transform";
import { transformInWorker } from "@/lib/workers/image-worker-client";
import { downloadBlob, extensionForType, withSuffix } from "@/lib/download";
import { shallowEqual } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BeforeAfterSlider } from "@/components/shared/before-after-slider";
import { FileSummary } from "@/components/shared/file-summary";
import { ResultError } from "@/components/shared/result-error";
import { resolveFormat } from "@/lib/image/image-output";

const transform = (
  file: File,
  settings: TransformSettings,
  { signal }: { signal: AbortSignal },
) => transformInWorker(file, settings, { signal });

/** Filename for a transformed blob, following the format it encoded to. */
export function transformedName(
  name: string,
  blob: Blob,
  suffix: string,
): string {
  return withSuffix(name, suffix, extensionForType(blob.type));
}

/**
 * Whether to offer WebP as a way out. The browser's PNG encoder is weaker
 * than whatever wrote the original, so re-encoding a PNG usually inflates it;
 * rather than just reporting that, the panel offers the format that wins.
 */
export function shouldSuggestWebp(
  saving: number,
  format: TransformSettings["format"],
  sourceType?: string,
): boolean {
  return saving < 0 && resolveFormat(format, sourceType) !== "image/webp";
}

/** Whole-percent change in file size. Negative means it grew. */
export function percentSmaller(before: number, after: number): number {
  if (before <= 0) return 0;
  return Math.round((1 - after / before) * 100);
}

interface TransformResultPanelProps {
  item: ImageQueueItem<TransformResult>;
  settings: TransformSettings;
  defaultSettings: TransformSettings;
  /** Suffix added to the downloaded filename, e.g. "-compressed". */
  suffix: string;
  /** The tool's own controls, rendered under the preview. */
  children: React.ReactNode;
  /** Show how much smaller the output is, for the compressor. */
  showSaving?: boolean;
  /** Supplied by the compressor so it can offer a one-click way out. */
  onSettingsChange?: (settings: TransformSettings) => void;
}

/**
 * Shared result panel for the convert / compress / resize trio. They differ
 * only in which controls they offer and what they emphasise about the output.
 */
export function TransformResultPanel({
  item,
  settings,
  defaultSettings,
  suffix,
  children,
  showSaving = false,
  onSettingsChange,
}: TransformResultPanelProps) {
  const transformed = useLiveResult({
    source: item.file,
    settings,
    process: transform,
    seed: {
      result: item.result,
      url: item.resultUrl,
      matches: shallowEqual(settings, defaultSettings),
    },
  });
  const previewUrl = transformed.url ?? item.resultUrl;
  const result = transformed.result;

  const handleDownload = () => {
    if (!result) return;
    downloadBlob(result.blob, transformedName(item.name, result.blob, suffix));
  };

  const saving = result ? percentSmaller(item.file.size, result.blob.size) : 0;
  const canSuggestWebp =
    showSaving &&
    onSettingsChange !== undefined &&
    shouldSuggestWebp(saving, settings.format, item.file.type);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="truncate text-base">{item.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {previewUrl && (
          <BeforeAfterSlider
            beforeUrl={item.originalUrl}
            afterUrl={previewUrl}
            beforeLabel="Original"
            afterLabel="Output"
            showCheckerboard
            isStale={transformed.isProcessing}
          />
        )}

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
                showSaving
                  ? saving > 0
                    ? `${saving}% smaller`
                    : `${Math.abs(saving)}% larger`
                  : undefined
              }
            />
          )}
          {transformed.error && <ResultError message={transformed.error} />}
          {canSuggestWebp && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <p className="text-muted-foreground text-xs">
                Re-encoding cannot beat the original here.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  onSettingsChange?.({ ...settings, format: "image/webp" })
                }
              >
                Try WebP instead
              </Button>
            </div>
          )}
        </div>

        {children}
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          onClick={handleDownload}
          disabled={!result || transformed.isProcessing}
          className="w-full"
        >
          {transformed.isProcessing ? (
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

/** Re-export so tools can build zip entries without importing the pipeline. */
export { transformImage };

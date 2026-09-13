"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { useLiveResult } from "@/hooks/use-live-result";
import type { ImageQueueItem } from "@/hooks/use-image-queue";
import {
  simulateImage,
  visionMode,
  type SimulateResult,
  type VisionType,
} from "@/lib/colour/colour-blindness";
import { downloadBlob, withSuffix } from "@/lib/download";
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
import { ZoomControl } from "@/components/shared/zoom-control";
import { VisionOptions } from "@/components/tools/colour-blindness/vision-options";

/** Settings here are a single choice, wrapped so the shared hook can hold it. */
export interface VisionSettings {
  vision: VisionType;
}

export const DEFAULT_VISION_SETTINGS: VisionSettings = { vision: "deuteranopia" };

const simulate = (
  file: File,
  settings: VisionSettings,
  { signal }: { signal: AbortSignal },
) => simulateImage(file, settings.vision, { signal });

export function simulatedName(name: string, vision: VisionType): string {
  return withSuffix(name, `-${vision}`, "png");
}

interface VisionResultPanelProps {
  item: ImageQueueItem<SimulateResult>;
  settings: VisionSettings;
  onSettingsChange: (settings: VisionSettings) => void;
}

export function VisionResultPanel({
  item,
  settings,
  onSettingsChange,
}: VisionResultPanelProps) {
  const [zoom, setZoom] = useState(1);
  const simulated = useLiveResult({
    source: item.file,
    settings,
    process: simulate,
    seed: {
      result: item.result,
      url: item.resultUrl,
      matches: settings.vision === DEFAULT_VISION_SETTINGS.vision,
    },
  });
  const previewUrl = simulated.url ?? item.resultUrl;
  const result = simulated.result;
  const mode = visionMode(settings.vision);

  const handleDownload = () => {
    if (!result) return;
    downloadBlob(result.blob, simulatedName(item.name, settings.vision));
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
              beforeLabel="Normal"
              afterLabel={mode.label}
              zoom={zoom}
              isStale={simulated.isProcessing}
            />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">
                Drag to compare · check whether anything you rely on colour
                alone to say survives
              </span>
              <ZoomControl zoom={zoom} onZoomChange={setZoom} />
            </div>
          </div>
        )}

        <FileSummary
          label="Image"
          width={item.sourceWidth}
          height={item.sourceHeight}
          type={item.file.type}
          bytes={item.file.size}
        />

        {simulated.error && <ResultError message={simulated.error} />}

        <VisionOptions
          vision={settings.vision}
          onChange={(vision) => onSettingsChange({ vision })}
        />
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          onClick={handleDownload}
          disabled={!result || simulated.isProcessing}
          className="w-full"
        >
          {simulated.isProcessing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Download PNG
        </Button>
      </CardFooter>
    </Card>
  );
}

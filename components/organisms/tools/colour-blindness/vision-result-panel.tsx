"use client";

import { useState } from "react";

import { useLiveResult } from "@/hooks/use-live-result";
import type { ImageQueueItem } from "@/hooks/use-image-queue";
import {
  simulateImage,
  simulatedName,
  type SimulateResult,
  type VisionType,
  visionMode,
} from "@/lib/colour/colour-blindness";
import { downloadBlob } from "@/lib/download";
import { DownloadButton } from "@/components/atoms/download-button";
import { ResultPanelShell } from "@/components/organisms/result-panel-shell";
import { BeforeAfterSlider } from "@/components/molecules/before-after-slider";
import { FileSummary } from "@/components/molecules/file-summary";
import { ResultError } from "@/components/atoms/result-error";
import { ZoomControl } from "@/components/atoms/zoom-control";
import { VisionOptions } from "@/components/organisms/tools/colour-blindness/vision-options";

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
    <ResultPanelShell
      title={item.name}
      footer={
        <DownloadButton
          onClick={handleDownload}
          busy={simulated.isProcessing}
          disabled={!result}
          label="Download PNG"
        />
      }
    >
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
    </ResultPanelShell>
  );
}
